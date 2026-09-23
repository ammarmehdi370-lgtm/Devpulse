'use client';

import React from 'react';

export const WorkspaceCardSkeleton: React.FC<{ count?: number }> = ({ count = 2 }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#141420] border border-[#222232] rounded-xl p-4 flex flex-col justify-between space-y-4 animate-pulse"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1">
              <div className="h-4 w-36 bg-[#252538] rounded-md" />
              <div className="h-3 w-28 bg-[#1d1d2c] rounded-md" />
            </div>
            <div className="flex gap-1.5">
              <div className="w-7 h-7 bg-[#202030] rounded-lg" />
              <div className="w-7 h-7 bg-[#202030] rounded-lg" />
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-[#1d1d2b]">
            <div className="flex items-center gap-3">
              <div className="h-3 w-12 bg-[#1d1d2c] rounded" />
              <div className="h-3 w-16 bg-[#1d1d2c] rounded" />
            </div>
            <div className="h-7 w-28 bg-[#252538] rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const RepositoryRowSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="grid grid-cols-1 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#111119] border border-[#1f1f2d] rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-pulse"
        >
          <div className="space-y-2.5 flex-1">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded bg-[#252538]" />
              <div className="h-4 w-44 bg-[#252538] rounded-md" />
              <div className="h-4 w-14 bg-[#1d1d2c] rounded-full" />
            </div>
            <div className="h-3 w-3/4 max-w-md bg-[#1d1d2c] rounded-md" />
            <div className="flex items-center gap-4 pt-1">
              <div className="h-3 w-16 bg-[#1d1d2c] rounded" />
              <div className="h-3 w-12 bg-[#1d1d2c] rounded" />
              <div className="h-3 w-24 bg-[#1d1d2c] rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#1d1d2c]" />
            <div className="w-8 h-8 rounded-xl bg-[#1d1d2c]" />
            <div className="h-8 w-28 rounded-xl bg-[#252538]" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const DeploymentCardSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-[#141420] border border-[#222232] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse"
        >
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-4 w-48 bg-[#252538] rounded-md" />
              <div className="h-4 w-12 bg-[#1d1d2c] rounded" />
            </div>
            <div className="h-3 w-32 bg-[#1d1d2c] rounded" />
            <div className="flex items-center gap-3 pt-1">
              <div className="h-3 w-16 bg-[#1d1d2c] rounded" />
              <div className="h-3 w-20 bg-[#1d1d2c] rounded" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-24 bg-[#252538] rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const ChatListSkeleton: React.FC = () => {
  return (
    <div className="flex-1 p-5 space-y-5 animate-pulse">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-[#202030] shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-24 bg-[#252538] rounded" />
              <div className="h-3 w-16 bg-[#1d1d2c] rounded" />
            </div>
            <div className="h-3 w-3/4 bg-[#1d1d2c] rounded" />
            <div className="h-3 w-1/2 bg-[#1d1d2c] rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};
