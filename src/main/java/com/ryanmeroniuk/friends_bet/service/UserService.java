package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.AuthResponse;
import com.ryanmeroniuk.friends_bet.dto.CreateUserRequest;
import com.ryanmeroniuk.friends_bet.dto.LoginRequest;
import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.repository.UserRepository;
import com.ryanmeroniuk.friends_bet.util.JwtUtil;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;
import java.util.UUID;
@Service
public class UserService {
    private final UserRepository userRepo;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    public UserService(UserRepository userRepo, PasswordEncoder passwordEncoder, JwtUtil jwtUtil){
        this.userRepo = userRepo;
        this.passwordEncoder = passwordEncoder;
        this.jwtUtil = jwtUtil;

    }

    /**
     * Registers a new user and returns an AuthResponse with a token.
     * @param req CreateUserRequest DTO object that carries the info the user entered when they signed up.
     * @return AuthResponse containing user info and a token for api calls.
     */
    public AuthResponse register (CreateUserRequest req){
        if ( userRepo.findByUsername(req.getUsername()).isPresent() ) {
            throw  new IllegalArgumentException("Username already in use");
        }
        if (userRepo.findByEmail(req.getEmail()).isPresent()) {
            throw new IllegalArgumentException("Email already registered");
        }

        // Hash the password.
        String hashed = passwordEncoder.encode(req.getPassword());
        User user = new User(req.getUsername(), req.getEmail(), hashed);
        User saved = userRepo.save(user);

        // Generate a jwt token
        String token = jwtUtil.generateToken(saved.getUsername());

        return new AuthResponse(
                saved.getId(),
                saved.getUsername(),
                saved.getEmail(),
                saved.getCreatedAt(),
                token
        );

    }

    /**
     * Logs an existing user in by username or email.
     * @param req LoginRequest DTO that contains the username or email of the user and their password.
     * @return AuthResponse containing user info and a token for api calls.
     */
    public AuthResponse login (LoginRequest req){
        Optional<User> byUsername = userRepo.findByUsername(req.getUsernameOrEmail());
        Optional<User> byEmail    = userRepo.findByEmail(req.getUsernameOrEmail());
        User user;
        if (byUsername.isPresent()) {
            user = byUsername.get();
        } else if (byEmail.isPresent()) {
            user = byEmail.get();
        } else {
            throw new IllegalArgumentException("Invalid credentials");
        }

        if (!passwordEncoder.matches(req.getPassword(), user.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid credentials");
        }

        String token = jwtUtil.generateToken(user.getUsername());

        return new AuthResponse(
                user.getId(),
                user.getUsername(),
                user.getEmail(),
                user.getCreatedAt(),
                token
        );
    }

}
