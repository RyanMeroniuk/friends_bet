package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.GroupMemberResponse;
import com.ryanmeroniuk.friends_bet.dto.JoinGroupRequest;
import com.ryanmeroniuk.friends_bet.model.Group;
import com.ryanmeroniuk.friends_bet.model.GroupMember;
import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.repository.GroupMemberRepository;
import com.ryanmeroniuk.friends_bet.repository.GroupRepository;
import com.ryanmeroniuk.friends_bet.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GroupMemberServiceTest {

    @Mock
    private GroupRepository groupRepo;

    @Mock
    private UserRepository userRepo;

    @Mock
    private GroupMemberRepository memberRepo;

    @InjectMocks
    private GroupMemberService groupMemberService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    private void setAuthUser(User user) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user.getUsername(), null, List.of()));
        when(userRepo.findByUsername(user.getUsername())).thenReturn(Optional.of(user));
    }

    @Test
    void joinGroup_success() {
        String inviteCode = "abc12345";
        UUID userId = UUID.randomUUID();
        Group group = new Group("Test Group");
        User user = buildUser(userId, "alice");
        setAuthUser(user);

        when(groupRepo.findByInviteCode(inviteCode)).thenReturn(Optional.of(group));
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(memberRepo.findByGroupAndUser(group, user)).thenReturn(Optional.empty());
        when(memberRepo.save(any(GroupMember.class))).thenAnswer(inv -> inv.getArgument(0));

        JoinGroupRequest req = new JoinGroupRequest();

        GroupMemberResponse response = groupMemberService.joinGroup(inviteCode, req);

        assertThat(response.getUserId()).isEqualTo(userId);
        assertThat(response.getUsername()).isEqualTo("alice");
        assertThat(response.getJoinedAt()).isNotNull();
        verify(memberRepo).save(any(GroupMember.class));
    }

    @Test
    void joinGroup_invalidInviteCode_throws() {
        User user = buildUser(UUID.randomUUID(), "alice");
        setAuthUser(user);

        when(groupRepo.findByInviteCode("bad-code")).thenReturn(Optional.empty());

        JoinGroupRequest req = new JoinGroupRequest();

        assertThatThrownBy(() -> groupMemberService.joinGroup("bad-code", req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Invalid invite code");

        verify(memberRepo, never()).save(any());
    }

    @Test
    void joinGroup_userNotFound_throws() {
        UUID userId = UUID.randomUUID();
        Group group = new Group("Test Group");
        User user = buildUser(userId, "alice");
        setAuthUser(user);

        when(groupRepo.findByInviteCode("abc12345")).thenReturn(Optional.of(group));
        when(userRepo.findById(userId)).thenReturn(Optional.empty());

        JoinGroupRequest req = new JoinGroupRequest();

        assertThatThrownBy(() -> groupMemberService.joinGroup("abc12345", req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("User not found");

        verify(memberRepo, never()).save(any());
    }

    @Test
    void joinGroup_alreadyMember_throws() {
        UUID userId = UUID.randomUUID();
        Group group = new Group("Test Group");
        User user = buildUser(userId, "alice");
        setAuthUser(user);
        GroupMember existing = new GroupMember(group, user);

        when(groupRepo.findByInviteCode("abc12345")).thenReturn(Optional.of(group));
        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(memberRepo.findByGroupAndUser(group, user)).thenReturn(Optional.of(existing));

        JoinGroupRequest req = new JoinGroupRequest();

        assertThatThrownBy(() -> groupMemberService.joinGroup("abc12345", req))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("User already in group");

        verify(memberRepo, never()).save(any());
    }

    @Test
    void listMembers_success() {
        UUID groupId = UUID.randomUUID();
        Group group = new Group("Test Group");
        User user1 = buildUser(UUID.randomUUID(), "alice");
        User user2 = buildUser(UUID.randomUUID(), "bob");
        GroupMember m1 = new GroupMember(group, user1);
        GroupMember m2 = new GroupMember(group, user2);

        // Set up auth context as user1 (a member)
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user1.getUsername(), null, List.of()));
        when(userRepo.findByUsername(user1.getUsername())).thenReturn(Optional.of(user1));
        when(memberRepo.existsByGroup_IdAndUser_Id(groupId, user1.getId())).thenReturn(true);

        when(groupRepo.findById(groupId)).thenReturn(Optional.of(group));
        when(memberRepo.findAllByGroup(group)).thenReturn(List.of(m1, m2));

        List<GroupMemberResponse> result = groupMemberService.listMembers(groupId);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(GroupMemberResponse::getUsername)
                .containsExactlyInAnyOrder("alice", "bob");
    }

    @Test
    void listMembers_groupNotFound_throws() {
        UUID groupId = UUID.randomUUID();
        when(groupRepo.findById(groupId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> groupMemberService.listMembers(groupId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Group not found");
    }

    private static User buildUser(UUID id, String username) {
        User u = new User(username, username + "@test.com", "hashed");
        u.setId(id);
        return u;
    }
}
