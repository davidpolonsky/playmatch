'use client';

import Script from 'next/script';

// Reddit Pixel — fires PageVisit on every page load
// Pixel ID: a2_is5oo2qv81sj
// To fire additional conversion events (e.g. SignUp), call:
//   window.rdt('track', 'SignUp')
// from any client component after the relevant action completes.

export default function RedditPixel() {
  return (
    <Script
      id="reddit-pixel"
      strategy="afterInteractive"
      dangerouslySetInnerHTML={{
        __html: `
          !function(w,d){if(!w.rdt){var p=w.rdt=function(){p.sendEvent?p.sendEvent.apply(p,arguments):p.queue.push(arguments)};p.queue=[];var t=d.createElement("script");t.src="https://www.redditstatic.com/ads/v2.js",t.async=!0;var s=d.getElementsByTagName("script")[0];s.parentNode.insertBefore(t,s)}}(window,document);
          rdt('init', 'a2_is5oo2qv81sj', { optOut: false, useDecimalCurrencyValues: true });
          rdt('track', 'PageVisit');
        `,
      }}
    />
  );
}
