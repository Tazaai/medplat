import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Users, Trophy, Award, Share2, Plus, UserPlus, Target } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://medplat-backend-139218747785.europe-west1.run.app';

export default function SocialTab({ uid }) {
  const [activeTab, setActiveTab] = useState('groups');
  const [groups, setGroups] = useState([]);
  const [myGroups, setMyGroups] = useState([]);
  const [challenges, setChallenges] = useState([]);
  const [myChallenges, setMyChallenges] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createGroupName, setCreateGroupName] = useState('');
  const [createGroupDescription, setCreateGroupDescription] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [uid]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadGroups(),
        loadChallenges(),
        loadAchievements()
      ]);
    } catch (err) {
      console.error('Failed to load social data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/social/groups?uid=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
        setMyGroups(data.groups?.filter(g => g.members?.includes(uid)) || []);
      }
    } catch (err) {
      console.error('Failed to load groups:', err);
    }
  };

  const loadChallenges = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/social/challenges?uid=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setChallenges(data.challenges || []);
        setMyChallenges(data.challenges?.filter(c => c.participants?.includes(uid)) || []);
      }
    } catch (err) {
      console.error('Failed to load challenges:', err);
    }
  };

  const loadAchievements = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/social/achievements?uid=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setAchievements(data.achievements || []);
      }
    } catch (err) {
      console.error('Failed to load achievements:', err);
    }
  };

  const createGroup = async () => {
    if (!createGroupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/social/groups/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_uid: uid,
          name: createGroupName,
          description: createGroupDescription
        })
      });

      if (res.ok) {
        setCreateGroupName('');
        setCreateGroupDescription('');
        setShowCreateGroup(false);
        loadGroups();
      } else {
        alert('Failed to create group. Please try again.');
      }
    } catch (err) {
      console.error('Failed to create group:', err);
      alert('Failed to create group. Please try again.');
    }
  };

  const joinGroup = async (groupId) => {
    try {
      const res = await fetch(`${API_BASE}/api/social/groups/${groupId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      });

      if (res.ok) {
        loadGroups();
      } else {
        alert('Failed to join group. Please try again.');
      }
    } catch (err) {
      console.error('Failed to join group:', err);
      alert('Failed to join group. Please try again.');
    }
  };

  const joinChallenge = async (challengeId) => {
    try {
      const res = await fetch(`${API_BASE}/api/social/challenges/${challengeId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid })
      });

      if (res.ok) {
        loadChallenges();
      } else {
        alert('Failed to join challenge. Please try again.');
      }
    } catch (err) {
      console.error('Failed to join challenge:', err);
      alert('Failed to join challenge. Please try again.');
    }
  };

  const shareAchievement = async (achievementId) => {
    try {
      const res = await fetch(`${API_BASE}/api/social/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          type: 'achievement',
          content_id: achievementId
        })
      });

      if (res.ok) {
        const data = await res.json();
        const shareUrl = `${window.location.origin}/share/${data.token}`;
        navigator.clipboard.writeText(shareUrl);
        alert('Share link copied to clipboard!');
      } else {
        alert('Failed to create share link. Please try again.');
      }
    } catch (err) {
      console.error('Failed to share achievement:', err);
      alert('Failed to share achievement. Please try again.');
    }
  };

  if (loading) {
    return <div className="p-4">Loading social features...</div>;
  }

  const getChallengeTypeIcon = (type) => {
    switch (type) {
      case 'xp_sprint': return '⚡';
      case 'quiz_marathon': return '📚';
      case 'accuracy': return '🎯';
      case 'streak': return '🔥';
      default: return '🏆';
    }
  };

  const getChallengeTypeColor = (type) => {
    switch (type) {
      case 'xp_sprint': return 'bg-yellow-500/10 text-yellow-500';
      case 'quiz_marathon': return 'bg-blue-500/10 text-blue-500';
      case 'accuracy': return 'bg-green-500/10 text-green-500';
      case 'streak': return 'bg-orange-500/10 text-orange-500';
      default: return 'bg-purple-500/10 text-purple-500';
    }
  };

  return (
    <div className="space-y-4 p-4">
      {/* Tab navigation */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'groups' ? 'default' : 'outline'}
              onClick={() => setActiveTab('groups')}
            >
              <Users className="h-4 w-4 mr-2" />
              Study Groups
            </Button>
            <Button
              variant={activeTab === 'challenges' ? 'default' : 'outline'}
              onClick={() => setActiveTab('challenges')}
            >
              <Target className="h-4 w-4 mr-2" />
              Challenges
            </Button>
            <Button
              variant={activeTab === 'achievements' ? 'default' : 'outline'}
              onClick={() => setActiveTab('achievements')}
            >
              <Award className="h-4 w-4 mr-2" />
              Achievements
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Study Groups Tab */}
      {activeTab === 'groups' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle>Study Groups</CardTitle>
                  <CardDescription>Join or create study groups to learn together</CardDescription>
                </div>
                <Button onClick={() => setShowCreateGroup(!showCreateGroup)} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </div>
            </CardHeader>

            {showCreateGroup && (
              <CardContent className="border-t">
                <div className="space-y-3 pt-4">
                  <div>
                    <label className="text-sm font-medium">Group Name</label>
                    <input
                      type="text"
                      value={createGroupName}
                      onChange={(e) => setCreateGroupName(e.target.value)}
                      placeholder="e.g., Cardiology Study Group"
                      className="w-full mt-1 px-3 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description (optional)</label>
                    <textarea
                      value={createGroupDescription}
                      onChange={(e) => setCreateGroupDescription(e.target.value)}
                      placeholder="What will you study together?"
                      className="w-full mt-1 px-3 py-2 border rounded-lg"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={createGroup}>Create Group</Button>
                    <Button variant="outline" onClick={() => setShowCreateGroup(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* My Groups */}
          {myGroups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">My Groups</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myGroups.map((group) => (
                    <div key={group.group_id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{group.name}</h4>
                          {group.description && (
                            <p className="text-sm text-muted-foreground">{group.description}</p>
                          )}
                        </div>
                        <Badge variant="outline">
                          <Users className="h-3 w-3 mr-1" />
                          {group.member_count || 0}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Created {new Date(group.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Groups */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Groups</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {groups
                  .filter(g => !myGroups.some(mg => mg.group_id === g.group_id))
                  .map((group) => (
                    <div key={group.group_id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-semibold">{group.name}</h4>
                          {group.description && (
                            <p className="text-sm text-muted-foreground">{group.description}</p>
                          )}
                        </div>
                        <Button onClick={() => joinGroup(group.group_id)} size="sm">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Join
                        </Button>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {group.member_count || 0} members
                        </span>
                        <span>Created {new Date(group.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                {groups.filter(g => !myGroups.some(mg => mg.group_id === g.group_id)).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No available groups. Create one to get started!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Challenges Tab */}
      {activeTab === 'challenges' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Active Challenges</CardTitle>
              <CardDescription>Compete with others and earn rewards</CardDescription>
            </CardHeader>
          </Card>

          {/* My Challenges */}
          {myChallenges.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">My Challenges</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {myChallenges.map((challenge) => (
                    <div key={challenge.challenge_id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{getChallengeTypeIcon(challenge.challenge_type)}</span>
                            <h4 className="font-semibold">{challenge.name}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">{challenge.description}</p>
                        </div>
                        <Badge className={getChallengeTypeColor(challenge.challenge_type)}>
                          {challenge.challenge_type?.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span>
                          <Trophy className="h-4 w-4 inline mr-1" />
                          {challenge.reward_xp} XP
                        </span>
                        <span>
                          <Users className="h-4 w-4 inline mr-1" />
                          {challenge.participant_count || 0} participants
                        </span>
                        <span className="text-muted-foreground">
                          Ends {new Date(challenge.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available Challenges */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Challenges</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {challenges
                  .filter(c => !myChallenges.some(mc => mc.challenge_id === c.challenge_id))
                  .map((challenge) => (
                    <div key={challenge.challenge_id} className="p-4 border rounded-lg">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-2xl">{getChallengeTypeIcon(challenge.challenge_type)}</span>
                            <h4 className="font-semibold">{challenge.name}</h4>
                          </div>
                          <p className="text-sm text-muted-foreground">{challenge.description}</p>
                        </div>
                        <Button onClick={() => joinChallenge(challenge.challenge_id)} size="sm">
                          Join Challenge
                        </Button>
                      </div>
                      <div className="flex gap-4 text-sm">
                        <span>
                          <Trophy className="h-4 w-4 inline mr-1" />
                          {challenge.reward_xp} XP
                        </span>
                        <span>
                          <Users className="h-4 w-4 inline mr-1" />
                          {challenge.participant_count || 0} participants
                        </span>
                        <span className="text-muted-foreground">
                          Ends {new Date(challenge.end_date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                {challenges.filter(c => !myChallenges.some(mc => mc.challenge_id === c.challenge_id)).length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    No available challenges at the moment.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Achievements Tab */}
      {activeTab === 'achievements' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Your Achievements</CardTitle>
              <CardDescription>Unlock badges as you progress</CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements.map((achievement) => (
              <Card key={achievement.achievement_id} className="relative overflow-hidden">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{achievement.icon || '🏆'}</div>
                      <div>
                        <CardTitle className="text-lg">{achievement.name}</CardTitle>
                        <CardDescription>{achievement.description}</CardDescription>
                      </div>
                    </div>
                    <Button
                      onClick={() => shareAchievement(achievement.achievement_id)}
                      size="sm"
                      variant="outline"
                    >
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    <Badge variant="outline">
                      <Award className="h-3 w-3 mr-1" />
                      {achievement.tier || 'Bronze'}
                    </Badge>
                    {achievement.unlocked_at && (
                      <span className="text-xs text-muted-foreground">
                        Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {achievements.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground py-8">
                  Complete quizzes and challenges to unlock achievements!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
