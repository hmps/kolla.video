"use client";

import { Keyboard, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface OnboardingDialogProps {
  open: boolean;
  onComplete: () => void;
}

const STEPS = [
  {
    title: "Welcome to the Player!",
    description:
      "Let's show you around. You can navigate clips, control playback, and collaborate with your team.",
    icon: null,
  },
  {
    title: "Keyboard Shortcuts",
    description:
      "Use keyboard shortcuts to navigate quickly. Press j/k or arrow keys to switch clips, space to play/pause, h/l to seek, and ? to see all shortcuts.",
    icon: Keyboard,
  },
  {
    title: "Comments & Collaboration",
    description:
      "Press 'c' to add a comment, or 'f' to toggle the comments panel. Coaches can leave feedback visible to everyone, just coaches, or private notes.",
    icon: MessageSquare,
  },
];

export function OnboardingDialog({ open, onComplete }: OnboardingDialogProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const step = STEPS[currentStep];
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            {Icon && (
              <div className="p-2 bg-primary/10 rounded-lg">
                <Icon className="h-6 w-6 text-primary" />
              </div>
            )}
            <DialogTitle>{step.title}</DialogTitle>
          </div>
          <DialogDescription className="text-base pt-2">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-center gap-2 py-2">
          {STEPS.map((step, index) => (
            <div
              key={step.title}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? "w-8 bg-primary"
                  : "w-2 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleSkip}>
            Skip
          </Button>
          <Button onClick={handleNext}>
            {currentStep < STEPS.length - 1 ? "Next" : "Get Started"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
