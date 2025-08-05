package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.CreateGroupRequest;
import com.ryanmeroniuk.friends_bet.dto.GroupResponse;
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
public class GroupService {
    private final GroupRepository groupRepo;
    private final UserRepository userRepo;
    private final GroupMemberRepository memberRepo;

    public GroupService(
            GroupRepository groupRepo,
            UserRepository userRepo,
            GroupMemberRepository memberRepo
    ) {
        this.groupRepo = groupRepo;
        this.userRepo = userRepo;
        this.memberRepo = memberRepo;
    }

    public GroupResponse createGroup(CreateGroupRequest req) {
        Group g = new Group(req.getName());
        Group saved = groupRepo.save(g);
        return toDto(saved);
    }

    public List<GroupResponse> listGroups() {
        return groupRepo.findAll().stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    /**
     * Only groups the given user belongs to.
     */
    public List<GroupResponse> listGroupsForUser(UUID userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return memberRepo.findAllByUser(user).stream()
                .map(GroupMember::getGroup)
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
}
