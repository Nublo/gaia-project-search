'use client';

import { useEffect, useRef, useState } from 'react';
import { buildBookmarklet } from '@/lib/bga-bookmarklet';

export default function BgaImportBookmarklet() {
  const linkRef = useRef<HTMLAnchorElement>(null);
  const [hint, setHint] = useState(false);

  // React blocks `javascript:` hrefs passed through JSX, so set it on the DOM
  // node directly. Built from the current origin so it also works on localhost.
  useEffect(() => {
    linkRef.current?.setAttribute('href', buildBookmarklet(`${window.location.origin}/builder`));
  }, []);

  return (
    <div className="w-full max-w-6xl mx-auto mb-4 p-4 bg-white rounded-lg shadow-md">
      <h4 className="text-xs font-semibold text-gray-600 uppercase mb-2">Import from Board Game Arena</h4>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <a
          ref={linkRef}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setHint(true);
          }}
          title="Drag me to your bookmarks bar"
          className="shrink-0 self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 cursor-grab"
        >
          ⤓ Gaia copy setup
        </a>
        <ol className="text-sm text-gray-600 list-decimal list-inside space-y-0.5">
          <li>
            Drag the green button to your bookmarks bar (once). Don&apos;t see the bar? Press{' '}
            <kbd className="px-1 rounded border border-gray-300 bg-gray-50 text-xs">⌘/Ctrl + Shift + B</kbd>.
          </li>
          <li>Open a Gaia Project game or its replay on Board Game Arena.</li>
          <li>Click the bookmark — this builder opens in a new tab with that game&apos;s setup: technologies, round and final scorings, federation tokens, Lost Fleet ships and artifacts.</li>
        </ol>
      </div>
      {hint && (
        <p className="mt-2 text-xs text-amber-700">
          Don&apos;t click it here — drag it to your bookmarks bar, then click it on a BGA game page.
        </p>
      )}
    </div>
  );
}
