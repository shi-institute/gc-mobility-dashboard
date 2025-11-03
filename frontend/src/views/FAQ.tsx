import styled from '@emotion/styled';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import { useEffect, useState } from 'react';
import bannerImageSrc from '../assets/images/faq-banner.jpg';
import { CoreFrame } from '../components';
import { AppNavigation } from '../components/navigation';
import { getDataOriginAndPath } from '../hooks/useAppData';

export function FAQ() {
  const { dataOrigin, dataPath } = getDataOriginAndPath();

  const [html, setHtml] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    fetch(dataOrigin + dataPath + '/faq.md', { redirect: 'error' })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to load FAQ content', { cause: response.statusText });
        }
        return response.text();
      })
      .then(async (text) => {
        const dirtyHtml = await marked.parse(text);
        const cleanHtml = DOMPurify.sanitize(dirtyHtml);
        setHtml(cleanHtml);
      })
      .catch((err) => {
        console.error('Error loading FAQ:', err);
        setError(err);
      })
      .finally(() => setLoading(false));
  }, [dataOrigin, dataPath]);

  return (
    <CoreFrame
      outerStyle={{ height: '100%' }}
      innerStyle={{ '--padding': 0 } as React.CSSProperties}
      loading={loading}
      header={<AppNavigation />}
      sections={[
        <div>
          <Header>
            <div className="overlay"></div>
            <div>
              <h1>Frequently Asked Questions</h1>
            </div>
          </Header>
          <StyledMarkdownContent
            className="markdown"
            dangerouslySetInnerHTML={{ __html: html }}
          ></StyledMarkdownContent>
          {error && (
            <div style={{ color: 'red', textAlign: 'center' }}>
              Error loading FAQ: {error.message}
            </div>
          )}
        </div>,
      ]}
      disableSectionColumns
    />
  );
}

const Header = styled.div`
  padding: 30px 20px;
  margin-top: auto;
  height: 200px;
  background-color: var(--color-secondary);
  background-image: url(${bannerImageSrc});
  background-size: cover;
  background-position: center;
  position: relative;
  display: flex;
  align-items: flex-end;
  justify-content: center;

  @container core (max-width: 1100px) {
    height: 160px;
  }
  @container core (max-width: 940px) {
    height: 120px;
  }
  @container core (max-width: 800px) {
    height: 90px;
  }

  div.overlay {
    position: absolute;
    inset: 0;
    background-color: rgba(0, 0, 0, 0.4);
  }

  div:not(.overlay) {
    max-width: 600px;
    flex-grow: 1;
    height: 100%;
    position: relative;

    h1 {
      margin: 0;
      font-size: 2rem;
      color: white;
      position: absolute;
      bottom: 0;
    }
  }
`;

const StyledMarkdownContent = styled.div`
  font-size: 14px;
  color: var(--text-primary);
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;

  h2 {
    margin: 1rem 0 0 0;
    color: var(--color-primary);
    font-size: 1.5em;
  }

  h3 {
    margin: 1rem 0 0 0;
    font-size: 16px;
  }
  h2 + h3 {
    margin-top: 0.25rem;
  }

  p {
    margin: 0 0 0.5rem 0;
  }

  a {
    appearance: none;
    border: none;
    background-color: transparent;
    margin: 0;
    padding: 0;
    cursor: pointer;
    font-family: inherit;
    font-size: inherit;

    color: var(--color-primary) !important;
    box-shadow: 0 1px 0 0 var(--color-primary);
    transition: background-color 0.2s, box-shadow 0.1s, color 0.2s;
    text-decoration: none;

    &:hover {
      box-shadow: 0 2px 0 0 var(--color-primary);
      background-color: hsla(var(--color-primary--parts), 0.1);
      color: var(--text-primary) !important;
    }

    &:active {
      background-color: hsla(var(--color-primary--parts), 0.16);
    }
  }
`;
