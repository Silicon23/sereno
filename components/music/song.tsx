'use client';

import React from 'react';

interface SongProps {
  title: string;
  author: string;
  coverImage: string;
  songUrl: string;
}

export function Song({ props: { title, author, coverImage, songUrl }}: { props: SongProps }) {
  return (
    <div
      className="rounded-xl border bg-zinc-950 p-4 text-black cursor-pointer hover:shadow-lg transition-shadow duration-300"
      onClick={() => window.open(songUrl, '_blank')}
    >
      <img
        src={coverImage}
        alt={`${title} cover`}
        className="w-full h-48 object-cover rounded-md mb-4"
      />
      <div className="text-lg font-bold text-white">{title}</div>
      <div className="text-sm text-gray-500">{author}</div>
    </div>
  );
}

// Example usage with placeholder data
<Song props={{
    title: "Placeholder Title",
    author: "Placeholder Author",
    coverImage: "https://via.placeholder.com/150",
    songUrl: "https://example.com"
  }}
/>
