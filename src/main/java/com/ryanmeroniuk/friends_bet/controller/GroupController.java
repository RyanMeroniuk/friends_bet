package com.ryanmeroniuk.friends_bet.controller;

import com.ryanmeroniuk.friends_bet.dto.CreateGroupRequest;
import com.ryanmeroniuk.friends_bet.dto.GroupResponse;
import com.ryanmeroniuk.friends_bet.service.GroupService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    private final GroupService groupService;

    public GroupController(GroupService groupService){
        this.groupService = groupService;
    }

    @PostMapping
    public ResponseEntity<GroupResponse> create(@RequestBody CreateGroupRequest req){
        GroupResponse resp = groupService.createGroup(req);
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(resp);
    }

    @GetMapping
    public List<GroupResponse> list(){
        return groupService.listGroups();
    }
}

