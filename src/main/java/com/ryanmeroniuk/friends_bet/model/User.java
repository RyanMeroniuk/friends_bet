package com.ryanmeroniuk.friends_bet.model;

import jakarta.persistence.*;

import java.time.Instant;
import java.util.UUID;

// Mark class as a database table named "users".
@Entity
@Table(name = "users")
public class User {

    // id randomly generated for a new user.
    @Id
    @GeneratedValue
    private UUID id;

    // User's username.
    // Cannot be null and must be unique.
    @Column(nullable = false, unique = true)
    private String username;

    //  User's email.
    @Column(nullable = false, unique = true)
    private String email;

    // User's password.
    @Column(nullable = false)
    private String passwordHash;

    // Timestamp when the user was created.
    @Column (nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    // JPA (Hibernate) needs a constructor with no arguments.
    public User() {}

    // Constructor for creating a new user.
    public User(String username, String email, String passwordHash){
        this.username = username;
        this.email = email;
        this.passwordHash = passwordHash;
    }

    // Getter for user id.
    public UUID getId() {
        return id;
    }

    // Getter for user's username.
    public String getUsername() {
        return username;
    }

    // Getter for user's email.
    public String getEmail() {
        return email;
    }

    // Getter for user's password.
    public String getPasswordHash() {
        return passwordHash;
    }

    // Getter for time user was created at.
    public Instant getCreatedAt() {
        return createdAt;
    }

    // Setter for users ID.
    public void setId(UUID id) {
        this.id = id;
    }

    // Setter for user's username.
    public void setUsername(String username) {
        this.username = username;
    }

    // Setter for user's email.
    public void setEmail(String email) {
        this.email = email;
    }

    // Setter for user's password.
    public void setPasswordHash(String password) {
        this.passwordHash = password;
    }
}
