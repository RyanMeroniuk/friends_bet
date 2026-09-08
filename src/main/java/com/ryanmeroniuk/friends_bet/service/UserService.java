package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.CreateUserRequest;
import com.ryanmeroniuk.friends_bet.dto.LoginRequest;
import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

@Service
public class UserService {

    private static final int MAX_FAILED_ATTEMPTS = 10;
    private static final long LOCKOUT_MINUTES = 15;
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;

    public UserService(UserRepository userRepo, PasswordEncoder passwordEncoder) {
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Registers a new user and returns the persisted entity.
     */
    @Transactional
    public User register(CreateUserRequest req) {
        if (userRepo.findByUsername(req.getUsername()).isPresent()) {
            throw new IllegalArgumentException("Username already in use");
        }
        if (userRepo.findByEmail(req.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        String hashed = passwordEncoder.encode(req.getPassword());
        User user = new User(req.getUsername(), req.getEmail(), hashed);
        return userRepo.save(user);
    }

    /**
     * Validates the provided credentials and returns the corresponding user.
     * Locks the account after MAX_FAILED_ATTEMPTS for LOCKOUT_MINUTES.
     */
    @Transactional
    public User login(LoginRequest req) {
        Optional<User> byUsername = userRepo.findByUsername(req.getUsernameOrEmail());
        Optional<User> byEmail = userRepo.findByEmail(req.getUsernameOrEmail());
        User user = byUsername.orElseGet(() -> byEmail.orElseThrow(() ->
                new IllegalArgumentException("Invalid credentials")));

        if (user.isLocked()) {
            throw new IllegalArgumentException("Account locked. Try again later.");
        }

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            user.setFailedAttempts(user.getFailedAttempts() + 1);
            if (user.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
                user.setLockedUntil(Instant.now().plus(LOCKOUT_MINUTES, ChronoUnit.MINUTES));
            }
            userRepo.save(user);
            throw new IllegalArgumentException("Invalid credentials");
        }

        // Successful login — reset lockout state
        if (user.getFailedAttempts() > 0) {
            user.setFailedAttempts(0);
            user.setLockedUntil(null);
            userRepo.save(user);
        }

        return user;
    }

    public User requireByUsername(String username) {
        return userRepo.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
    }
}
