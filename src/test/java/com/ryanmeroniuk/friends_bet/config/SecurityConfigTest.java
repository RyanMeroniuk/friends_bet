package com.ryanmeroniuk.friends_bet.config;

import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.repository.UserRepository;
import com.ryanmeroniuk.friends_bet.util.JwtUtil;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class SecurityConfigTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private UserRepository userRepository;

    // ── Public endpoints ──

    @Test
    void publicEndpoints_noAuth_200() throws Exception {
        mockMvc.perform(get("/ping"))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/users/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"u\",\"email\":\"e\",\"password\":\"p\"}"))
                // Validation may fail (400) but should NOT be 401
                .andExpect(status().is4xxClientError());

        mockMvc.perform(post("/api/users/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usernameOrEmail\":\"u\",\"password\":\"p\"}"))
                // Credentials may fail (400/401) but should NOT be 401 from security filter
                .andExpect(status().is4xxClientError());
    }

    // ── Protected endpoints ──

    @Test
    void protectedEndpoints_noAuth_401() throws Exception {
        mockMvc.perform(get("/api/groups"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/groups/" + UUID.randomUUID() + "/bets"))
                .andExpect(status().isUnauthorized());
    }

    // ── Protected with valid token ──

    @Test
    void protectedEndpoints_validToken_200() throws Exception {
        // Persist a real user so UserDetailsService + UserService can find it
        User user = userRepository.save(new User("sectest", "sectest@example.com", "hashed"));

        JwtUtil.TokenDetails accessDetails = jwtUtil.generateAccessToken(user, 60_000);
        String token = accessDetails.token();

        mockMvc.perform(get("/api/users/me")
                        .header("Authorization", "Bearer " + token))
                .andExpect(status().isOk());
    }

    // ── Public GET endpoints ──

    @Test
    void publicGetEndpoints_sports_games() throws Exception {
        mockMvc.perform(get("/api/sports"))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/games/upcoming"))
                .andExpect(status().isOk());
    }
}
