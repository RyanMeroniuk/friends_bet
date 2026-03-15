package com.ryanmeroniuk.friends_bet.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.ryanmeroniuk.friends_bet.dto.CreateGroupRequest;
import com.ryanmeroniuk.friends_bet.dto.GroupMemberResponse;
import com.ryanmeroniuk.friends_bet.dto.GroupResponse;
import com.ryanmeroniuk.friends_bet.dto.JoinGroupRequest;
import com.ryanmeroniuk.friends_bet.config.SecurityConfig;
import com.ryanmeroniuk.friends_bet.filter.AdminSecretFilter;
import com.ryanmeroniuk.friends_bet.filter.JwtAuthenticationFilter;
import com.ryanmeroniuk.friends_bet.service.GroupMemberService;
import com.ryanmeroniuk.friends_bet.service.GroupService;
import com.ryanmeroniuk.friends_bet.service.UserDetailsService;
import com.ryanmeroniuk.friends_bet.support.TestJwtHelper;
import com.ryanmeroniuk.friends_bet.util.JwtUtil;
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.User;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(GroupController.class)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, AdminSecretFilter.class})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class GroupControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private GroupService groupService;

    @MockitoBean
    private GroupMemberService memberService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserDetailsService userDetailsService;

    private String accessToken;

    @BeforeEach
    void setUpAuth() {
        UUID userId = UUID.randomUUID();
        String username = "testuser";
        accessToken = TestJwtHelper.generateAccessToken(username, userId);

        Claims claims = new io.jsonwebtoken.impl.DefaultClaims();
        claims.setSubject(username);
        claims.put("token_type", "access");
        claims.put("uid", userId.toString());

        when(jwtUtil.parseAndValidate(accessToken)).thenReturn(claims);
        when(userDetailsService.loadUserByUsername(username)).thenReturn(
                User.builder().username(username).password("pw").roles("USER").build());
    }

    // ── Create ──

    @Test
    void create_201_returnsGroup() throws Exception {
        UUID groupId = UUID.randomUUID();
        GroupResponse resp = new GroupResponse(groupId, "Test Group", "ABC123", Instant.now());
        when(groupService.createGroup(any(CreateGroupRequest.class))).thenReturn(resp);

        CreateGroupRequest req = new CreateGroupRequest();
        req.setName("Test Group");

        mockMvc.perform(post("/api/groups")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").value(groupId.toString()))
                .andExpect(jsonPath("$.name").value("Test Group"))
                .andExpect(jsonPath("$.inviteCode").value("ABC123"));
    }

    @Test
    void create_400_blankName() throws Exception {
        CreateGroupRequest req = new CreateGroupRequest();
        req.setName("");

        mockMvc.perform(post("/api/groups")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.name").exists());
    }

    @Test
    void create_400_nameTooShort() throws Exception {
        CreateGroupRequest req = new CreateGroupRequest();
        req.setName("A");

        mockMvc.perform(post("/api/groups")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.name").exists());
    }

    @Test
    void create_401_noAuth() throws Exception {
        CreateGroupRequest req = new CreateGroupRequest();
        req.setName("Test Group");

        mockMvc.perform(post("/api/groups")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isUnauthorized());
    }

    // ── List ──

    @Test
    void list_200_returnsGroups() throws Exception {
        List<GroupResponse> groups = List.of(
                new GroupResponse(UUID.randomUUID(), "Group 1", "CODE1", Instant.now()),
                new GroupResponse(UUID.randomUUID(), "Group 2", "CODE2", Instant.now())
        );
        when(groupService.listGroups()).thenReturn(groups);

        mockMvc.perform(get("/api/groups")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].name").value("Group 1"))
                .andExpect(jsonPath("$[1].name").value("Group 2"));
    }

    // ── List for user ──

    @Test
    void listForUser_200_returnsUserGroups() throws Exception {
        UUID userId = UUID.randomUUID();
        List<GroupResponse> groups = List.of(
                new GroupResponse(UUID.randomUUID(), "My Group", "CODE1", Instant.now())
        );
        when(groupService.listGroupsForUser(userId)).thenReturn(groups);

        mockMvc.perform(get("/api/users/{userId}/groups", userId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].name").value("My Group"));
    }

    // ── Join ──

    @Test
    void join_201_returnsGroupMember() throws Exception {
        UUID userId = UUID.randomUUID();
        GroupMemberResponse resp = new GroupMemberResponse(
                UUID.randomUUID(), UUID.randomUUID(), userId, Instant.now(), "testuser");
        when(memberService.joinGroup(eq("ABC123"), any(JoinGroupRequest.class))).thenReturn(resp);

        JoinGroupRequest req = new JoinGroupRequest();
        req.setUserId(userId);

        mockMvc.perform(post("/api/groups/ABC123/join")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.userId").value(userId.toString()))
                .andExpect(jsonPath("$.username").value("testuser"));
    }

    @Test
    void join_400_invalidInviteCode() throws Exception {
        when(memberService.joinGroup(eq("BADCODE"), any(JoinGroupRequest.class)))
                .thenThrow(new IllegalArgumentException("Invalid invite code"));

        JoinGroupRequest req = new JoinGroupRequest();
        req.setUserId(UUID.randomUUID());

        mockMvc.perform(post("/api/groups/BADCODE/join")
                        .header("Authorization", "Bearer " + accessToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest());
    }

    // ── Members ──

    @Test
    void members_200_returnsList() throws Exception {
        UUID groupId = UUID.randomUUID();
        List<GroupMemberResponse> members = List.of(
                new GroupMemberResponse(UUID.randomUUID(), groupId, UUID.randomUUID(), Instant.now(), "user1"),
                new GroupMemberResponse(UUID.randomUUID(), groupId, UUID.randomUUID(), Instant.now(), "user2")
        );
        when(memberService.listMembers(groupId)).thenReturn(members);

        mockMvc.perform(get("/api/groups/{groupId}/members", groupId)
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].username").value("user1"));
    }
}
