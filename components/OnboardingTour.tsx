'use client';

import React, { useEffect, useState } from 'react';
import { Joyride, type Step, type EventData } from 'react-joyride';

interface OnboardingTourProps {
  userId: string;
  onComplete: () => void;
}

export default function OnboardingTour({ userId, onComplete }: OnboardingTourProps) {
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Small delay to ensure DOM elements are ready
    const timer = setTimeout(() => {
      setRun(true);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const steps: Step[] = [
    {
      target: 'body',
      content: (
        <div>
          <h2 style={{ margin: '0 0 12px', fontSize: '20px', fontWeight: 'bold' }}>
            Welcome to PlayMatch! 👋
          </h2>
          <p style={{ margin: '0 0 12px', fontSize: '15px', lineHeight: '1.5' }}>
            Let's get you set up in 60 seconds. You'll learn how to snap cards, build teams,
            simulate epic matches, and challenge your friends.
          </p>
          <p style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>
            Click <strong>Next</strong> to start the tour (4 steps)
          </p>
        </div>
      ),
      placement: 'center',
      skipBeacon: true,
    },
    {
      target: '[data-tour="add-player"]',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 'bold' }}>
            📸 Step 1: Snap Your Cards
          </h3>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
            Click <strong>"Add Player"</strong> to scan any physical soccer or basketball card
            with your camera. We'll read the player name and stats right off the card. Works
            with any card from any era — vintage or modern, Panini or Topps, doesn't matter.
          </p>
        </div>
      ),
      placement: 'bottom',
      blockTargetInteraction: true,
    },
    {
      target: '[data-tour="my-teams"]',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 'bold' }}>
            ⚽ Step 2: Build Your Dream Team
          </h3>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
            Once you've added players, head to <strong>"My Teams"</strong> to create a starting
            lineup. Drag and drop your players into formation. Mix eras — put '92 Cantona next
            to '24 Vinícius, or MJ next to Embiid. Build as many teams as you want.
          </p>
        </div>
      ),
      placement: 'bottom',
      blockTargetInteraction: true,
    },
    {
      target: '[data-tour="simulate"]',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 'bold' }}>
            🔥 Step 3: Simulate Epic Matches
          </h3>
          <p style={{ margin: '0 0 8px', fontSize: '14px', lineHeight: '1.5' }}>
            Pick your team, choose an opponent (another one of your teams, a friend's team, or
            a pre-built legendary squad like Pep's Barça or the '96 Bulls), and hit
            <strong> "Simulate Match"</strong>.
          </p>
          <p style={{ margin: 0, fontSize: '14px', lineHeight: '1.5' }}>
            Watch live play-by-play commentary unfold. Takes 90 seconds. Goals, fouls, subs —
            the whole thing.
          </p>
        </div>
      ),
      placement: 'bottom',
      blockTargetInteraction: true,
    },
    {
      target: '[data-tour="share-team"]',
      content: (
        <div>
          <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 'bold' }}>
            🤝 Step 4: Challenge Your Friends
          </h3>
          <p style={{ margin: '0 0 10px', fontSize: '14px', lineHeight: '1.5' }}>
            Every team gets a share link. Send it to a friend, they build their own squad,
            now you've got a rivalry. This is where it gets fun.
          </p>
          <p style={{ margin: '0 0 10px', fontSize: '14px', lineHeight: '1.5', color: '#94a3b8' }}>
            <strong>Quick tip:</strong> No cards on you right now? No problem. Skip step 1 and
            run a match between two legendary teams (in the Teams tab) to see how games play out.
          </p>
          <p style={{ margin: 0, fontSize: '14px', fontWeight: 'bold' }}>
            That's it — you're ready to play! 🎉
          </p>
        </div>
      ),
      placement: 'left',
      blockTargetInteraction: true,
    },
  ];

  const handleJoyrideCallback = (data: EventData) => {
    const { status } = data;

    const STATUS_FINISHED = 'finished';
    const STATUS_SKIPPED = 'skipped';

    if (status === STATUS_FINISHED || status === STATUS_SKIPPED) {
      // Tour completed or skipped
      setRun(false);
      onComplete();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      onEvent={handleJoyrideCallback}
      options={{
        showProgress: true,
        buttons: ['back', 'skip', 'primary'],
        overlayClickAction: false,
        dismissKeyAction: false,
        spotlightPadding: 8,
      }}
      styles={{
        beaconInner: {
          backgroundColor: '#4ade80',
        },
        beaconOuter: {
          backgroundColor: 'rgba(74, 222, 128, 0.2)',
          border: '2px solid #4ade80',
        },
        overlay: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
        tooltip: {
          padding: 20,
          borderRadius: 12,
          backgroundColor: '#1e293b',
          color: '#e2e8f0',
        },
        tooltipContainer: {
          textAlign: 'left',
        },
        tooltipContent: {
          padding: 0,
        },
        buttonPrimary: {
          backgroundColor: '#4ade80',
          color: '#052e16',
          fontSize: '14px',
          fontWeight: 'bold',
          padding: '10px 20px',
          borderRadius: '8px',
        },
        buttonBack: {
          color: '#94a3b8',
          fontSize: '14px',
          marginRight: 10,
        },
        buttonSkip: {
          color: '#64748b',
          fontSize: '13px',
        },
      }}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Done',
        next: 'Next',
        skip: 'Skip tour',
      }}
    />
  );
}
