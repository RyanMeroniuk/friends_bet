package com.ryanmeroniuk.friends_bet.repository;

import com.ryanmeroniuk.friends_bet.model.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public class UserRepository {
    public interface userRepository extends JpaRepository<User, UUID> {
        Optional<User> findByEmail(String email);
        Optional<User> findByUsername(String username);
    }
}
