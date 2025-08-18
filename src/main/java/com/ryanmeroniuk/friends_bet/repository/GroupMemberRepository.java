// backend/src/main/java/com/ryanmeroniuk/friends_bet/repository/GroupMemberRepository.java

package com.ryanmeroniuk.friends_bet.repository;

import com.ryanmeroniuk.friends_bet.model.GroupMember;
import com.ryanmeroniuk.friends_bet.model.User;
import com.ryanmeroniuk.friends_bet.model.Group;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {
    Optional<GroupMember> findByGroupAndUser(Group group, User user);
    List<GroupMember> findAllByGroup(Group group);
    List<GroupMember> findAllByUser(User user);
    boolean existsByGroup_IdAndUser_Id(UUID groupId, UUID userId);
}
