package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.WalletDepositRequest;
import com.ryanmeroniuk.friends_bet.model.Group;
import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.model.Wallet;
import com.ryanmeroniuk.friends_bet.repository.GroupRepository;
import com.ryanmeroniuk.friends_bet.repository.UserRepository;
import com.ryanmeroniuk.friends_bet.repository.WalletRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("test")
class WalletServiceConcurrencyTest {

    @Autowired
    private WalletService walletService;

    @Autowired
    private WalletRepository walletRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GroupRepository groupRepository;

    private Group testGroup;
    private User testUser;

    @BeforeEach
    void setUp() {
        // Clean up any existing test data
        walletRepository.deleteAll();
        groupRepository.deleteAll();
        userRepository.deleteAll();

        // Create test entities
        testUser = userRepository.save(new User(
                "concurrency-test-user-" + UUID.randomUUID().toString().substring(0, 8),
                "concurrency-" + UUID.randomUUID().toString().substring(0, 8) + "@test.com",
                "hashedPassword"
        ));
        testGroup = groupRepository.save(new Group("Concurrency Test Group"));
    }

    @Test
    void concurrent_deposits_should_not_lose_updates() throws Exception {
        // Given: Initial wallet with 10000 cents ($100)
        long initialBalance = 10_000;
        WalletDepositRequest initialDeposit = new WalletDepositRequest();
        initialDeposit.setUserId(testUser.getId());
        initialDeposit.setAmountCents(initialBalance);
        walletService.deposit(testGroup.getId(), initialDeposit);

        // When: 20 concurrent threads each deposit 100 cents ($1)
        int threadCount = 20;
        long depositAmount = 100;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        List<Future<?>> futures = new ArrayList<>();
        for (int i = 0; i < threadCount; i++) {
            futures.add(executor.submit(() -> {
                try {
                    startLatch.await(); // Wait for all threads to be ready
                    WalletDepositRequest req = new WalletDepositRequest();
                    req.setUserId(testUser.getId());
                    req.setAmountCents(depositAmount);
                    walletService.deposit(testGroup.getId(), req);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            }));
        }

        // Start all threads simultaneously
        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        // Check for any exceptions
        for (Future<?> future : futures) {
            future.get(); // Will throw if the task failed
        }

        // Then: Final balance should be initial + (threadCount * depositAmount)
        Wallet wallet = walletRepository.findByGroupAndUser(testGroup, testUser).orElseThrow();
        long expectedBalance = initialBalance + (threadCount * depositAmount);
        assertThat(wallet.getBalanceCents())
                .as("All deposits should be reflected in final balance (no lost updates)")
                .isEqualTo(expectedBalance);
    }

    @Test
    void concurrent_withdrawals_should_not_overdraw() throws Exception {
        // Given: Wallet with 1000 cents ($10)
        long initialBalance = 1_000;
        WalletDepositRequest initialDeposit = new WalletDepositRequest();
        initialDeposit.setUserId(testUser.getId());
        initialDeposit.setAmountCents(initialBalance);
        walletService.deposit(testGroup.getId(), initialDeposit);

        // When: 20 concurrent threads each try to withdraw 100 cents ($1)
        // Only 10 should succeed (1000 / 100 = 10)
        int threadCount = 20;
        long withdrawAmount = 100;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);

        AtomicInteger successCount = new AtomicInteger(0);
        AtomicInteger failCount = new AtomicInteger(0);

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    startLatch.await();
                    WalletDepositRequest req = new WalletDepositRequest();
                    req.setUserId(testUser.getId());
                    req.setAmountCents(-withdrawAmount); // negative = withdrawal
                    walletService.deposit(testGroup.getId(), req);
                    successCount.incrementAndGet();
                } catch (IllegalArgumentException e) {
                    // Expected for some threads: "Insufficient funds"
                    failCount.incrementAndGet();
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        // Then: Exactly 10 withdrawals should succeed, 10 should fail
        Wallet wallet = walletRepository.findByGroupAndUser(testGroup, testUser).orElseThrow();

        assertThat(wallet.getBalanceCents())
                .as("Balance should never go negative")
                .isGreaterThanOrEqualTo(0);

        assertThat(successCount.get())
                .as("Only withdrawals that don't overdraw should succeed")
                .isEqualTo(10);

        assertThat(failCount.get())
                .as("Withdrawals that would overdraw should fail")
                .isEqualTo(10);

        assertThat(wallet.getBalanceCents())
                .as("Final balance should be zero after all successful withdrawals")
                .isEqualTo(0);
    }

    @Test
    void concurrent_mixed_operations_should_maintain_consistency() throws Exception {
        // Given: Wallet with 5000 cents ($50)
        long initialBalance = 5_000;
        WalletDepositRequest initialDeposit = new WalletDepositRequest();
        initialDeposit.setUserId(testUser.getId());
        initialDeposit.setAmountCents(initialBalance);
        walletService.deposit(testGroup.getId(), initialDeposit);

        // When: Mixed concurrent operations
        // 10 threads deposit 200 cents each = +2000
        // 10 threads withdraw 100 cents each = -1000
        // Net change = +1000, expected final = 6000
        int depositors = 10;
        int withdrawers = 10;
        long depositAmount = 200;
        long withdrawAmount = 100;

        ExecutorService executor = Executors.newFixedThreadPool(depositors + withdrawers);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(depositors + withdrawers);

        List<Future<?>> futures = new ArrayList<>();

        // Submit deposit tasks
        for (int i = 0; i < depositors; i++) {
            futures.add(executor.submit(() -> {
                try {
                    startLatch.await();
                    WalletDepositRequest req = new WalletDepositRequest();
                    req.setUserId(testUser.getId());
                    req.setAmountCents(depositAmount);
                    walletService.deposit(testGroup.getId(), req);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            }));
        }

        // Submit withdrawal tasks
        for (int i = 0; i < withdrawers; i++) {
            futures.add(executor.submit(() -> {
                try {
                    startLatch.await();
                    WalletDepositRequest req = new WalletDepositRequest();
                    req.setUserId(testUser.getId());
                    req.setAmountCents(-withdrawAmount);
                    walletService.deposit(testGroup.getId(), req);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                } finally {
                    doneLatch.countDown();
                }
            }));
        }

        startLatch.countDown();
        doneLatch.await();
        executor.shutdown();

        // Check for exceptions
        for (Future<?> future : futures) {
            future.get();
        }

        // Then: Balance should reflect all operations correctly
        Wallet wallet = walletRepository.findByGroupAndUser(testGroup, testUser).orElseThrow();
        long expectedBalance = initialBalance + (depositors * depositAmount) - (withdrawers * withdrawAmount);
        assertThat(wallet.getBalanceCents())
                .as("Mixed concurrent operations should maintain consistency")
                .isEqualTo(expectedBalance);
    }
}
