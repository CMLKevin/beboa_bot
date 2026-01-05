import { notFound } from 'next/navigation';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { getDocBySlug, getAllDocSlugs } from '@/lib/mdx';
import { PageNavigation } from '@/components/content/PageNavigation';
import { TableOfContents } from '@/components/content/TableOfContents';
import { CodeBlock } from '@/components/content/CodeBlock';
import { Callout } from '@/components/content/Callout';
import { Breadcrumbs } from '@/components/content/Breadcrumbs';
import { CopyPageButton } from '@/components/content/CopyPageButton';

// New MDX components
import { Tabs, Tab, TabContent } from '@/components/content/Tabs';
import { Steps, Step } from '@/components/content/Steps';
import { Card, CardGroup } from '@/components/content/Card';
import { Accordion, AccordionGroup } from '@/components/content/Accordion';
import { Badge, TypeBadge } from '@/components/content/Badge';
import { PropertyTable, EnvTable } from '@/components/content/PropertyTable';
import { CommandReference } from '@/components/content/CommandReference';
import { LinkCard, LinkCardGroup, Related } from '@/components/content/LinkCard';

// Diagram components
import {
  Diagram,
  DiagramBox,
  DiagramArrow,
  DiagramGroup,
  DiagramLabel,
} from '@/components/diagrams/DiagramPrimitives';
import {
  AISystemsDiagram,
  ServicesLayerDiagram,
  ServerMemoryPipelineDiagram,
  MessageFlowDiagram,
} from '@/components/diagrams/ArchitectureDiagram';

interface PageProps {
  params: Promise<{
    slug: string[];
  }>;
}

// Custom MDX components
const components = {
  // Code blocks
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => {
    const codeElement = children as React.ReactElement<{
      children?: string;
      className?: string;
    }>;
    if (codeElement?.props) {
      const language = codeElement.props.className?.replace('language-', '');
      const code = codeElement.props.children || '';
      return <CodeBlock language={language}>{code.toString().trim()}</CodeBlock>;
    }
    return <pre {...props}>{children}</pre>;
  },

  // Core components
  Callout,
  CodeBlock,

  // Navigation & structure
  Tabs,
  Tab,
  TabContent,
  Steps,
  Step,
  Card,
  CardGroup,
  Accordion,
  AccordionGroup,

  // Reference components
  Badge,
  TypeBadge,
  PropertyTable,
  EnvTable,
  CommandReference,
  LinkCard,
  LinkCardGroup,
  Related,

  // Diagrams
  Diagram,
  DiagramBox,
  DiagramArrow,
  DiagramGroup,
  DiagramLabel,
  AISystemsDiagram,
  ServicesLayerDiagram,
  ServerMemoryPipelineDiagram,
  MessageFlowDiagram,

  // Linked headings
  h2: ({ children, id, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { id?: string }) => (
    <h2 id={id} {...props}>
      <a href={`#${id}`} className="anchor-link">
        {children}
      </a>
    </h2>
  ),
  h3: ({ children, id, ...props }: React.HTMLAttributes<HTMLHeadingElement> & { id?: string }) => (
    <h3 id={id} {...props}>
      <a href={`#${id}`} className="anchor-link">
        {children}
      </a>
    </h3>
  ),
};

export async function generateStaticParams() {
  const slugs = getAllDocSlugs();
  return slugs.map((slug) => ({
    slug: slug.length === 0 ? [''] : slug,
  }));
}

export default async function DocPage({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

  if (!doc) {
    notFound();
  }

  return (
    <>
      <article className="animate-in">
        {/* Page Header: Breadcrumbs + Copy Button */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <Breadcrumbs />
          <CopyPageButton />
        </div>

        {/* Title */}
        <h1>{doc.meta.title}</h1>

        {doc.meta.description && (
          <p className="text-lg text-[var(--text-secondary)] mb-8 -mt-2">
            {doc.meta.description}
          </p>
        )}

        {/* Content */}
        <div className="prose-custom">
          <MDXRemote
            source={doc.content}
            components={components}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm],
                rehypePlugins: [rehypeSlug],
              },
            }}
          />
        </div>

        {/* Navigation */}
        <PageNavigation />
      </article>

      {/* Table of Contents */}
      <TableOfContents />
    </>
  );
}

export async function generateMetadata({ params }: PageProps) {
  const { slug } = await params;
  const doc = getDocBySlug(slug);

  if (!doc) {
    return {
      title: 'Not Found',
    };
  }

  return {
    title: `${doc.meta.title} - Beboa Docs`,
    description: doc.meta.description,
  };
}
