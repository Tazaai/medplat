/**
 * StudyGroup - Collaborative learning component
 * Phase 7 M5 - Social Features
 * 
 * Features:
 * - Group creation and management
 * - Member invitations
 * - Shared progress tracking
 * - Group leaderboard
 * - Collaborative quiz mode
 */

import React, { useState, useEffect } from 'react';
import './StudyGroup.css';

const StudyGroup = ({ userId, groupId }) => {
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  useEffect(() => {
    if (groupId) {
      fetchGroupData();
      fetchLeaderboard();
    }
  }, [groupId]);

  const fetchGroupData = async () => {
    setIsLoading(true);
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/api/social/groups/${groupId}`);
      
      if (response.ok) {
        const data = await response.json();
        setGroup(data.group);
        setMembers(data.group.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch group:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLeaderboard = async () => {
    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/api/social/leaderboard/group/${groupId}?metric=xp`);
      
      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data.leaderboard || []);
      }
    } catch (err) {
      console.error('Failed to fetch leaderboard:', err);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteEmail) return;

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';
      const response = await fetch(`${backendUrl}/api/social/groups/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupId,
          inviter_uid: userId,
          invitee_email: inviteEmail
        })
      });

      if (response.ok) {
        setInviteEmail('');
        setShowInviteModal(false);
        alert('Invitation sent!');
      }
    } catch (err) {
      console.error('Failed to send invitation:', err);
    }
  };

  if (isLoading) {
    return <div className="study-group-loading">Loading group...</div>;
  }

  if (!group) {
    return <div className="study-group-empty">No group selected</div>;
  }

  return (
    <div className="study-group-container">
      <div className="group-header">
        <div className="group-info">
          <h2>{group.name}</h2>
          <p className="group-description">{group.description}</p>
          <div className="group-meta">
            <span className="member-count">👥 {group.member_count} members</span>
            {group.specialty && (
              <span className="group-specialty">🎯 {group.specialty}</span>
            )}
          </div>
        </div>
        <button 
          className="btn-invite"
          onClick={() => setShowInviteModal(true)}
        >
          + Invite Members
        </button>
      </div>

      {/* Group Leaderboard */}
      <div className="group-leaderboard-section">
        <h3>Group Leaderboard 🏆</h3>
        <div className="leaderboard-list">
          {leaderboard.map((entry, index) => (
            <div key={entry.uid} className={`leaderboard-entry rank-${index + 1}`}>
              <div className="entry-rank">
                {index === 0 && '🥇'}
                {index === 1 && '🥈'}
                {index === 2 && '🥉'}
                {index > 2 && `#${index + 1}`}
              </div>
              <div className="entry-user">
                <span className="user-name">User {entry.uid.substring(0, 8)}</span>
              </div>
              <div className="entry-score">
                <strong>{entry.score.toLocaleString()}</strong> XP
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Members List */}
      <div className="group-members-section">
        <h3>Members ({members.length})</h3>
        <div className="members-grid">
          {members.map(memberUid => (
            <div key={memberUid} className="member-card">
              <div className="member-avatar">
                {memberUid.charAt(0).toUpperCase()}
              </div>
              <div className="member-name">
                User {memberUid.substring(0, 8)}
              </div>
              {memberUid === group.creator_uid && (
                <span className="creator-badge">Creator</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="invite-modal-overlay" onClick={() => setShowInviteModal(false)}>
          <div className="invite-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Invite to {group.name}</h3>
            <input
              type="email"
              placeholder="Enter email address"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="invite-email-input"
            />
            <div className="invite-modal-actions">
              <button className="btn-send-invite" onClick={handleInviteMember}>
                Send Invitation
              </button>
              <button className="btn-cancel" onClick={() => setShowInviteModal(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyGroup;
