import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { BookOpen, Clock, Target, Trophy, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'https://medplat-backend-139218747785.us-central1.run.app';

export default function ExamPrepTab({ uid }) {
  const [tracks, setTracks] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [results, setResults] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTracks();
    loadHistory();
  }, [uid]);

  // Timer countdown
  useEffect(() => {
    if (activeSession && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [activeSession, timeRemaining]);

  const loadTracks = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/exam_prep/tracks`);
      if (res.ok) {
        const data = await res.json();
        setTracks(data.tracks || []);
      }
    } catch (err) {
      console.error('Failed to load tracks:', err);
    }
  };

  const loadHistory = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/exam_prep/history?uid=${uid}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setLoading(false);
    }
  };

  const startExam = async (trackId) => {
    try {
      // Create session
      const createRes = await fetch(`${API_BASE}/api/exam_prep/session/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uid, track_id: trackId })
      });

      if (!createRes.ok) throw new Error('Failed to create session');
      const { session_id } = await createRes.json();

      // Start session
      const startRes = await fetch(`${API_BASE}/api/exam_prep/session/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id })
      });

      if (!startRes.ok) throw new Error('Failed to start session');
      const sessionData = await startRes.json();

      setActiveSession(sessionData.session);
      setCurrentQuestion(sessionData.session.questions[0]);
      setQuestionIndex(0);
      setAnswers({});
      setTimeRemaining(sessionData.session.duration_minutes * 60);
      setResults(null);
    } catch (err) {
      console.error('Failed to start exam:', err);
      alert('Failed to start exam. Please try again.');
    }
  };

  const answerQuestion = async (questionId, answer) => {
    if (!activeSession) return;

    try {
      await fetch(`${API_BASE}/api/exam_prep/session/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: activeSession.session_id,
          question_id: questionId,
          answer
        })
      });

      setAnswers(prev => ({ ...prev, [questionId]: answer }));
    } catch (err) {
      console.error('Failed to save answer:', err);
    }
  };

  const nextQuestion = () => {
    if (questionIndex < activeSession.questions.length - 1) {
      setQuestionIndex(questionIndex + 1);
      setCurrentQuestion(activeSession.questions[questionIndex + 1]);
    }
  };

  const prevQuestion = () => {
    if (questionIndex > 0) {
      setQuestionIndex(questionIndex - 1);
      setCurrentQuestion(activeSession.questions[questionIndex - 1]);
    }
  };

  const submitExam = async () => {
    if (!activeSession) return;

    try {
      const markRes = await fetch(`${API_BASE}/api/exam_prep/session/mark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.session_id })
      });

      if (!markRes.ok) throw new Error('Failed to mark exam');
      const markData = await markRes.json();

      const completeRes = await fetch(`${API_BASE}/api/exam_prep/session/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: activeSession.session_id })
      });

      if (!completeRes.ok) throw new Error('Failed to complete session');

      setResults(markData);
      setActiveSession(null);
      loadHistory();
    } catch (err) {
      console.error('Failed to submit exam:', err);
      alert('Failed to submit exam. Please try again.');
    }
  };

  const handleTimeUp = () => {
    alert('Time is up! Submitting your exam...');
    submitExam();
  };

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${mins}m ${secs}s`;
  };

  if (loading) {
    return <div className="p-4">Loading exam tracks...</div>;
  }

  // Results view
  if (results) {
    const passThreshold = 60;
    const passed = results.score_percentage >= passThreshold;

    return (
      <div className="space-y-4 p-4">
        <Card className={passed ? 'border-green-500' : 'border-red-500'}>
          <CardHeader>
            <div className="flex items-center gap-2">
              {passed ? <Trophy className="h-6 w-6 text-green-500" /> : <AlertCircle className="h-6 w-6 text-red-500" />}
              <CardTitle>{passed ? 'Congratulations!' : 'Keep Practicing'}</CardTitle>
            </div>
            <CardDescription>Your exam has been completed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Score</p>
                <p className="text-3xl font-bold">{results.score_percentage}%</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Correct Answers</p>
                <p className="text-3xl font-bold">{results.correct}/{results.total}</p>
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Performance by Section</p>
              {results.by_section && Object.entries(results.by_section).map(([section, data]) => (
                <div key={section} className="mb-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{section}</span>
                    <span>{data.correct}/{data.total} ({Math.round(data.correct / data.total * 100)}%)</span>
                  </div>
                  <Progress value={data.correct / data.total * 100} className="h-2" />
                </div>
              ))}
            </div>

            <Button onClick={() => setResults(null)} className="w-full">
              Back to Exam Tracks
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Active exam view
  if (activeSession && currentQuestion) {
    const answeredCount = Object.keys(answers).length;
    const totalQuestions = activeSession.questions.length;

    return (
      <div className="space-y-4 p-4">
        {/* Timer and progress header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                <span className="font-mono text-lg">{formatTime(timeRemaining)}</span>
              </div>
              <Badge variant={answeredCount === totalQuestions ? 'default' : 'secondary'}>
                {answeredCount}/{totalQuestions} Answered
              </Badge>
            </div>
            <Progress value={(answeredCount / totalQuestions) * 100} className="h-2" />
          </CardContent>
        </Card>

        {/* Question card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex justify-between">
              <span>Question {questionIndex + 1} of {totalQuestions}</span>
              <Badge>{currentQuestion.section}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-lg">{currentQuestion.stem}</p>

            <div className="space-y-2">
              {currentQuestion.options.map((option, idx) => {
                const optionLetter = String.fromCharCode(65 + idx); // A, B, C, D
                const isSelected = answers[currentQuestion.question_id] === optionLetter;

                return (
                  <button
                    key={idx}
                    onClick={() => answerQuestion(currentQuestion.question_id, optionLetter)}
                    className={`w-full text-left p-4 border rounded-lg transition-colors ${
                      isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <span className="font-medium">{optionLetter}.</span> {option}
                  </button>
                );
              })}
            </div>

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                onClick={prevQuestion}
                disabled={questionIndex === 0}
                variant="outline"
              >
                Previous
              </Button>
              {questionIndex === totalQuestions - 1 ? (
                <Button onClick={submitExam} disabled={answeredCount < totalQuestions}>
                  Submit Exam
                </Button>
              ) : (
                <Button onClick={nextQuestion}>
                  Next
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Track selection view
  return (
    <div className="space-y-4 p-4">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Target className="h-6 w-6" />
            <CardTitle>Exam Preparation Tracks</CardTitle>
          </div>
          <CardDescription>Practice with full-length exam simulations</CardDescription>
        </CardHeader>
      </Card>

      {/* Recent history */}
      {history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.slice(0, 3).map((attempt, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 border rounded">
                  <div>
                    <p className="font-medium">{attempt.track_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(attempt.completed_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant={attempt.score_percentage >= 60 ? 'default' : 'secondary'}>
                    {attempt.score_percentage}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available tracks */}
      <div className="grid gap-4">
        {tracks.map((track) => (
          <Card key={track.track_id}>
            <CardHeader>
              <CardTitle>{track.name}</CardTitle>
              <CardDescription>{track.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {track.total_questions} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {track.duration_minutes} minutes
                  </span>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">Sections:</p>
                  <div className="flex flex-wrap gap-2">
                    {track.sections.map((section, idx) => (
                      <Badge key={idx} variant="outline">
                        {section.name} ({section.questions})
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button onClick={() => startExam(track.track_id)} className="w-full">
                  Start Practice Exam
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
