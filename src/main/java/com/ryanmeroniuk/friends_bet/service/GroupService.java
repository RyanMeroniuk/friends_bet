package com.ryanmeroniuk.friends_bet.service;

import com.ryanmeroniuk.friends_bet.dto.CreateGroupRequest;
import com.ryanmeroniuk.friends_bet.dto.GroupResponse;
import com.ryanmeroniuk.friends_bet.model.Group;
import com.ryanmeroniuk.friends_bet.repository.GroupRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class GroupService {
    private final GroupRepository groupRepo;

    public GroupService (GroupRepository groupRepo) {
        this.groupRepo = groupRepo;
    }

    public GroupResponse createGroup(CreateGroupRequest req){

        Group g = new Group(req.getName());
        Group saved = groupRepo.save(g);
        return toDto(saved);
    }

    public List<GroupResponse> listGroups(){
        return groupRepo.findAll().stream().map(this::toDto)
                .collect(Collectors.toList());
    }

    private GroupResponse toDto(Group g) {
        return new GroupResponse(g.getId(), g.getName(),
                g.getInviteCode(),g.getCreatedAt());
    }
}
