package com.ryanmeroniuk.friends_bet.repository;

import com.ryanmeroniuk.friends_bet.model.Group;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface GroupRepository extends JpaRepository<Group, UUID> {
    Optional<Group> findByInviteCode(String inviteCode);
}
