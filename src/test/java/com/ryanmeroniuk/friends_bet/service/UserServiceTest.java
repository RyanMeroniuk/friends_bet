package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.CreateUserRequest;
import com.ryanmeroniuk.friends_bet.dto.LoginRequest;
import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepo;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private UserService userService;

    @Test
    void register_success() {
        CreateUserRequest req = createUserRequest("alice", "alice@test.com", "password123");

        when(userRepo.findByUsername("alice")).thenReturn(Optional.empty());
        when(userRepo.findByEmail("alice@test.com")).thenReturn(Optional.empty());
        when(passwordEncoder.encode("password123")).thenReturn("hashed-pw");
        when(userRepo.save(any(User.class))).thenAnswer(inv -> {
            User u = inv.getArgument(0);
            u.setId(UUID.randomUUID());
            return u;
        });

        User result = userService.register(req);

        assertThat(result.getUsername()).isEqualTo("alice");
        assertThat(result.getEmail()).isEqualTo("alice@test.com");
        assertThat(result.getPasswordHash()).isEqualTo("hashed-pw");
        assertThat(result.getId()).isNotNull();

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepo).save(captor.capture());
        assertThat(captor.getValue().getPasswordHash()).isEqualTo("hashed-pw");
    }

    @Test
    void register_duplicateUsername_throws() {
        CreateUserRequest req = createUserRequest("alice", "alice@test.com", "password123");
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(new User()));

        assertThatThrownBy(() -> userService.register(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Username already in use");

        verify(userRepo, never()).save(any());
    }

    @Test
    void register_duplicateEmail_throws() {
        CreateUserRequest req = createUserRequest("alice", "alice@test.com", "password123");
        when(userRepo.findByUsername("alice")).thenReturn(Optional.empty());
        when(userRepo.findByEmail("alice@test.com")).thenReturn(Optional.of(new User()));

        assertThatThrownBy(() -> userService.register(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Email already registered");

        verify(userRepo, never()).save(any());
    }

    @Test
    void login_byUsername_success() {
        User user = buildUser("alice", "alice@test.com", "hashed-pw");
        LoginRequest req = loginRequest("alice", "password123");

        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashed-pw")).thenReturn(true);

        User result = userService.login(req);

        assertThat(result.getUsername()).isEqualTo("alice");
    }

    @Test
    void login_byEmail_success() {
        User user = buildUser("alice", "alice@test.com", "hashed-pw");
        LoginRequest req = loginRequest("alice@test.com", "password123");

        when(userRepo.findByUsername("alice@test.com")).thenReturn(Optional.empty());
        when(userRepo.findByEmail("alice@test.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password123", "hashed-pw")).thenReturn(true);

        User result = userService.login(req);

        assertThat(result.getUsername()).isEqualTo("alice");
    }

    @Test
    void login_wrongPassword_throws() {
        User user = buildUser("alice", "alice@test.com", "hashed-pw");
        LoginRequest req = loginRequest("alice", "wrongpass");

        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongpass", "hashed-pw")).thenReturn(false);

        assertThatThrownBy(() -> userService.login(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid credentials");
    }

    @Test
    void login_notFound_throws() {
        LoginRequest req = loginRequest("nobody", "password123");

        when(userRepo.findByUsername("nobody")).thenReturn(Optional.empty());
        when(userRepo.findByEmail("nobody")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.login(req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid credentials");
    }

    @Test
    void requireByUsername_found() {
        User user = buildUser("alice", "alice@test.com", "hashed-pw");
        when(userRepo.findByUsername("alice")).thenReturn(Optional.of(user));

        User result = userService.requireByUsername("alice");

        assertThat(result.getUsername()).isEqualTo("alice");
    }

    @Test
    void requireByUsername_notFound_throws() {
        when(userRepo.findByUsername("ghost")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.requireByUsername("ghost"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("User not found");
    }

    // --- helpers ---

    private static CreateUserRequest createUserRequest(String username, String email, String password) {
        CreateUserRequest req = new CreateUserRequest();
        req.setUsername(username);
        req.setEmail(email);
        req.setPassword(password);
        return req;
    }

    private static LoginRequest loginRequest(String usernameOrEmail, String password) {
        LoginRequest req = new LoginRequest();
        req.setUsernameOrEmail(usernameOrEmail);
        req.setPassword(password);
        return req;
    }

    private static User buildUser(String username, String email, String passwordHash) {
        User user = new User(username, email, passwordHash);
        user.setId(UUID.randomUUID());
        return user;
    }
}
