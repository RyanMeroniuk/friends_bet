package com.ryanmeroniuk.friends_bet.controller;

import com.ryanmeroniuk.friends_bet.dto.CreateGroupRequest;
import com.ryanmeroniuk.friends_bet.dto.GroupResponse;
import com.ryanmeroniuk.friends_bet.dto.JoinGroupRequest;
import com.ryanmeroniuk.friends_bet.dto.GroupMemberResponse;
import com.ryanmeroniuk.friends_bet.service.GroupService;
import com.ryanmeroniuk.friends_bet.service.GroupMemberService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class GroupController {

    private final GroupService groupService;
    private final GroupMemberService memberService;

    public GroupController(GroupService groupService,
                           GroupMemberService memberService) {
        this.groupService = groupService;
        this.memberService = memberService;
    }

    /** Create a new group */
    @PostMapping("/groups")
    public ResponseEntity<GroupResponse> create(@Valid @RequestBody CreateGroupRequest req) {
        GroupResponse resp = groupService.createGroup(req);
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    /** List all groups (admin view) */
    @GetMapping("/groups")
    public List<GroupResponse> list() {
        return groupService.listGroups();
    }

    /** List groups the given user belongs to */
    @GetMapping("/users/{userId}/groups")
    public List<GroupResponse> listGroupsForUser(@PathVariable UUID userId) {
        return groupService.listGroupsForUser(userId);
    }

    /** Join a group by invite code */
    @PostMapping("/groups/{inviteCode}/join")
    public ResponseEntity<GroupMemberResponse> join(
            @PathVariable String inviteCode,
            @Valid @RequestBody JoinGroupRequest req
    ) {
        GroupMemberResponse resp = memberService.joinGroup(inviteCode, req);
        return ResponseEntity.status(HttpStatus.CREATED).body(resp);
    }

    /** List members of a group */
    @GetMapping("/groups/{groupId}/members")
    public List<GroupMemberResponse> members(@PathVariable UUID groupId) {
        return memberService.listMembers(groupId);
    }
}
