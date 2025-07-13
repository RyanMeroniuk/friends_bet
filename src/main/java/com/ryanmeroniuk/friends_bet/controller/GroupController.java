package com.ryanmeroniuk.friends_bet.controller;

import com.ryanmeroniuk.friends_bet.dto.CreateGroupRequest;
import com.ryanmeroniuk.friends_bet.dto.GroupResponse;
import com.ryanmeroniuk.friends_bet.dto.JoinGroupRequest;
import com.ryanmeroniuk.friends_bet.dto.GroupMemberResponse;
import com.ryanmeroniuk.friends_bet.service.GroupService;
import com.ryanmeroniuk.friends_bet.service.GroupMemberService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    private final GroupService groupService;
    private final GroupMemberService memberService;

    public GroupController(GroupService groupService,
                           GroupMemberService memberService) {
        this.groupService = groupService;
        this.memberService = memberService;
    }

    @PostMapping
    public ResponseEntity<GroupResponse> create(@RequestBody CreateGroupRequest req) {
        GroupResponse resp = groupService.createGroup(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    @GetMapping
    public List<GroupResponse> list() {
        return groupService.listGroups();
    }

    @PostMapping("/{inviteCode}/join")
    public ResponseEntity<GroupMemberResponse> join(
            @PathVariable String inviteCode,
            @RequestBody JoinGroupRequest req
    ) {
        GroupMemberResponse resp = memberService.joinGroup(inviteCode, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    @GetMapping("/{groupId}/members")
    public List<GroupMemberResponse> members(@PathVariable UUID groupId) {
        return memberService.listMembers(groupId);
    }
}
