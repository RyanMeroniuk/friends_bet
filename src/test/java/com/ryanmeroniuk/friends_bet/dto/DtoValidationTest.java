package com.ryanmeroniuk.friends_bet.dto;

import jakarta.validation.ConstraintViolation;
import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class DtoValidationTest {

    private static Validator validator;

    @BeforeAll
    static void setUpValidator() {
        validator = Validation.buildDefaultValidatorFactory().getValidator();
    }

    // ── CreateUserRequest ──

    @Test
    void CreateUserRequest_valid_noViolations() {
        CreateUserRequest req = new CreateUserRequest();
        req.setUsername("validuser");
        req.setEmail("user@example.com");
        req.setPassword("password123");

        assertThat(validator.validate(req)).isEmpty();
    }

    @Test
    void CreateUserRequest_blankUsername_violation() {
        CreateUserRequest req = new CreateUserRequest();
        req.setUsername("");
        req.setEmail("user@example.com");
        req.setPassword("password123");

        Set<ConstraintViolation<CreateUserRequest>> violations = validator.validate(req);
        assertThat(violations).isNotEmpty();
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("username"));
    }

    @Test
    void CreateUserRequest_usernameTooShort_violation() {
        CreateUserRequest req = new CreateUserRequest();
        req.setUsername("ab");
        req.setEmail("user@example.com");
        req.setPassword("password123");

        Set<ConstraintViolation<CreateUserRequest>> violations = validator.validate(req);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("username"));
    }

    @Test
    void CreateUserRequest_usernameTooLong_violation() {
        CreateUserRequest req = new CreateUserRequest();
        req.setUsername("a".repeat(31));
        req.setEmail("user@example.com");
        req.setPassword("password123");

        Set<ConstraintViolation<CreateUserRequest>> violations = validator.validate(req);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("username"));
    }

    @Test
    void CreateUserRequest_invalidEmail_violation() {
        CreateUserRequest req = new CreateUserRequest();
        req.setUsername("validuser");
        req.setEmail("not-an-email");
        req.setPassword("password123");

        Set<ConstraintViolation<CreateUserRequest>> violations = validator.validate(req);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("email"));
    }

    @Test
    void CreateUserRequest_passwordTooShort_violation() {
        CreateUserRequest req = new CreateUserRequest();
        req.setUsername("validuser");
        req.setEmail("user@example.com");
        req.setPassword("short");

        Set<ConstraintViolation<CreateUserRequest>> violations = validator.validate(req);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("password"));
    }

    // ── LoginRequest ──

    @Test
    void LoginRequest_blankFields_violations() {
        LoginRequest req = new LoginRequest();
        req.setUsernameOrEmail("");
        req.setPassword("");

        Set<ConstraintViolation<LoginRequest>> violations = validator.validate(req);
        assertThat(violations).hasSizeGreaterThanOrEqualTo(2);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("usernameOrEmail"));
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("password"));
    }

    // ── CreateGroupRequest ──

    @Test
    void CreateGroupRequest_blankName_violation() {
        CreateGroupRequest req = new CreateGroupRequest();
        req.setName("");

        Set<ConstraintViolation<CreateGroupRequest>> violations = validator.validate(req);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("name"));
    }

    @Test
    void CreateGroupRequest_nameTooShort_violation() {
        CreateGroupRequest req = new CreateGroupRequest();
        req.setName("A");

        Set<ConstraintViolation<CreateGroupRequest>> violations = validator.validate(req);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("name"));
    }

    // ── CreateBetRequest ──

    @Test
    void CreateBetRequest_nullGameId_violation() {
        CreateBetRequest req = validBetRequest();
        req.setGameId(null);

        Set<ConstraintViolation<CreateBetRequest>> violations = validator.validate(req);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("gameId"));
    }

    @Test
    void CreateBetRequest_zeroAmount_violation() {
        CreateBetRequest req = validBetRequest();
        req.setAmountCents(0);

        Set<ConstraintViolation<CreateBetRequest>> violations = validator.validate(req);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("amountCents"));
    }

    @Test
    void CreateBetRequest_negativeOdds_violation() {
        CreateBetRequest req = validBetRequest();
        req.setOdds(-1.0);

        Set<ConstraintViolation<CreateBetRequest>> violations = validator.validate(req);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("odds"));
    }

    @Test
    void CreateBetRequest_oddsBelow1_violation() {
        CreateBetRequest req = validBetRequest();
        req.setOdds(0.5);

        Set<ConstraintViolation<CreateBetRequest>> violations = validator.validate(req);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("odds"));
    }

    @Test
    void CreateBetRequest_oddsExactly1_violation() {
        CreateBetRequest req = validBetRequest();
        req.setOdds(1.0);

        Set<ConstraintViolation<CreateBetRequest>> violations = validator.validate(req);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("odds"));
    }

    // ── WalletDepositRequest ──

    @Test
    void WalletDepositRequest_nullUserId_violation() {
        WalletDepositRequest req = new WalletDepositRequest();
        req.setAmountCents(1000);

        Set<ConstraintViolation<WalletDepositRequest>> violations = validator.validate(req);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("userId"));
    }

    // ── JoinGroupRequest ──

    @Test
    void JoinGroupRequest_nullUserId_violation() {
        JoinGroupRequest req = new JoinGroupRequest();

        Set<ConstraintViolation<JoinGroupRequest>> violations = validator.validate(req);
        assertThat(violations).anyMatch(v -> v.getPropertyPath().toString().equals("userId"));
    }

    // ── Helpers ──

    private CreateBetRequest validBetRequest() {
        CreateBetRequest req = new CreateBetRequest();
        req.setGroupId(UUID.randomUUID());
        req.setGameId(UUID.randomUUID());
        req.setMarketType("WINNER");
        req.setPick("HOME");
        req.setAmountCents(1000);
        req.setOdds(1.5);
        return req;
    }
}
