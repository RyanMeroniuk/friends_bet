package com.ryanmeroniuk.friends_bet.repository;

import com.ryanmeroniuk.friends_bet.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public class UserRepository {
    // Access to database methods
    public interface userRepository extends JpaRepository<User, UUID> {
        // Methods to easily find user by email or username.
        Optional<User> findByEmail(String email);
        Optional<User> findByUsername(String username);
    }
}
