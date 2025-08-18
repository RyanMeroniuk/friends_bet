package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.CreateGroupRequest;
import com.ryanmeroniuk.friends_bet.dto.GroupMemberResponse;
import com.ryanmeroniuk.friends_bet.dto.GroupResponse;
import com.ryanmeroniuk.friends_bet.dto.JoinGroupRequest;
import com.ryanmeroniuk.friends_bet.model.Group;
import com.ryanmeroniuk.friends_bet.model.GroupMember;
import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.repository.GroupMemberRepository;
import com.ryanmeroniuk.friends_bet.repository.GroupRepository;
import com.ryanmeroniuk.friends_bet.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class GroupMemberService {
    private final GroupRepository groupRepo;
    private final UserRepository userRepo;
    private final GroupMemberRepository memberRepo;

    public GroupMemberService(GroupRepository groupRepo, UserRepository userRepo, GroupMemberRepository memberRepo) {
        this.groupRepo = groupRepo;
        this.userRepo = userRepo;
        this.memberRepo = memberRepo;
    }

    /**
     * Creates a new group and returns its public DTO.
     */
    public GroupResponse createGroup(CreateGroupRequest req) {
        Group g = new Group(req.getName());
        Group saved = groupRepo.save(g);
        return toDto(saved);
    }

    /**
     * Lists all groups as public DTOs.
     */
    public List<GroupResponse> listGroups() {
        return groupRepo.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    private GroupResponse toDto(Group g) {
        return new GroupResponse(
                g.getId(),
                g.getName(),
                g.getInviteCode(),
                g.getCreatedAt()
        );
    }

    /**
     * Join a group by invite code.
     */
    public GroupMemberResponse joinGroup(String inviteCode, JoinGroupRequest req) {
        Group group = groupRepo.findByInviteCode(inviteCode)
                .orElseThrow(() -> new IllegalArgumentException("Invalid invite code"));

        User user = userRepo.findById(req.getUserId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // Prevent double-join
        if (memberRepo.findByGroupAndUser(group, user).isPresent()) {
            throw new IllegalArgumentException("User already in group");
        }

        GroupMember gm = new GroupMember(group, user);
        GroupMember saved = memberRepo.save(gm);

        return new GroupMemberResponse(
                saved.getId(),
                group.getId(),
                user.getId(),
                saved.getJoinedAt(),
                user.getUsername()
        );
    }

    /**
     * List members of a group.
     */
    public List<GroupMemberResponse> listMembers(UUID groupId) {
        Group group = groupRepo.findById(groupId)
                .orElseThrow(() -> new IllegalArgumentException("Group not found"));

        return memberRepo.findAllByGroup(group).stream()
                .map(m -> new GroupMemberResponse(
                        m.getId(),
                        groupId,
                        m.getUser().getId(),
                        m.getJoinedAt(),
                        m.getUser().getUsername()
                ))
                .collect(Collectors.toList());
    }
}
