package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.CreateGroupRequest;
import com.ryanmeroniuk.friends_bet.dto.GroupResponse;
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

import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GroupServiceTest {

    @Mock
    private GroupRepository groupRepo;

    @Mock
    private UserRepository userRepo;

    @Mock
    private GroupMemberRepository memberRepo;

    @InjectMocks
    private GroupService groupService;

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
    void createGroup_savesAndReturnsDto() {
        CreateGroupRequest req = new CreateGroupRequest();
        req.setName("Poker Night");

        when(groupRepo.save(any(Group.class))).thenAnswer(inv -> inv.getArgument(0));

        GroupResponse response = groupService.createGroup(req);

        assertThat(response.getName()).isEqualTo("Poker Night");
        assertThat(response.getInviteCode()).isNotNull().hasSize(8);
        assertThat(response.getCreatedAt()).isNotNull();
    }

    @Test
    void listGroups_returnsAll() {
        Group g1 = new Group("Group A");
        Group g2 = new Group("Group B");
        when(groupRepo.findAll()).thenReturn(List.of(g1, g2));

        List<GroupResponse> result = groupService.listGroups();

        assertThat(result).hasSize(2);
        assertThat(result).extracting(GroupResponse::getName)
                .containsExactlyInAnyOrder("Group A", "Group B");
    }

    @Test
    void listGroupsForUser_success() {
        UUID userId = UUID.randomUUID();
        User user = buildUser(userId);
        setAuthUser(user);

        Group g1 = new Group("Group A");
        Group g2 = new Group("Group B");
        GroupMember m1 = new GroupMember(g1, user);
        GroupMember m2 = new GroupMember(g2, user);

        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(memberRepo.findAllByUser(user)).thenReturn(List.of(m1, m2));

        List<GroupResponse> result = groupService.listGroupsForUser(userId);

        assertThat(result).hasSize(2);
        assertThat(result).extracting(GroupResponse::getName)
                .containsExactlyInAnyOrder("Group A", "Group B");
    }

    @Test
    void listGroupsForUser_userNotFound_throws() {
        UUID userId = UUID.randomUUID();
        User user = buildUser(userId);
        setAuthUser(user);

        when(userRepo.findById(userId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> groupService.listGroupsForUser(userId))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("User not found");
    }

    @Test
    void listGroupsForUser_noMemberships_returnsEmpty() {
        UUID userId = UUID.randomUUID();
        User user = buildUser(userId);
        setAuthUser(user);

        when(userRepo.findById(userId)).thenReturn(Optional.of(user));
        when(memberRepo.findAllByUser(user)).thenReturn(Collections.emptyList());

        List<GroupResponse> result = groupService.listGroupsForUser(userId);

        assertThat(result).isEmpty();
    }

    private static User buildUser(UUID id) {
        User u = new User("user-" + id.toString().substring(0, 8), id + "@test.com", "hashed");
        u.setId(id);
        return u;
    }
}
