import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const contentDirectory = path.join(process.cwd(), 'content');

export interface DocMeta {
  title: string;
  description?: string;
  slug: string;
}

export interface Doc {
  meta: DocMeta;
  content: string;
}

// Get all MDX files recursively
export function getAllDocs(): DocMeta[] {
  const docs: DocMeta[] = [];

  function walkDir(dir: string, prefix: string = '') {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        walkDir(filePath, path.join(prefix, file));
      } else if (file.endsWith('.mdx') || file.endsWith('.md')) {
        const slug = path.join(prefix, file.replace(/\.(mdx|md)$/, ''));
        const content = fs.readFileSync(filePath, 'utf-8');
        const { data } = matter(content);

        docs.push({
          title: data.title || formatTitle(file.replace(/\.(mdx|md)$/, '')),
          description: data.description,
          slug: slug === 'index' ? '' : slug.replace(/\/index$/, ''),
        });
      }
    }
  }

  walkDir(contentDirectory);
  return docs;
}

// Get a single doc by slug
export function getDocBySlug(slug: string[]): Doc | null {
  const slugPath = slug.join('/');

  // Try different file patterns
  const patterns = [
    path.join(contentDirectory, `${slugPath}.mdx`),
    path.join(contentDirectory, `${slugPath}.md`),
    path.join(contentDirectory, slugPath, 'index.mdx'),
    path.join(contentDirectory, slugPath, 'index.md'),
  ];

  for (const filePath of patterns) {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      const { data, content: mdxContent } = matter(content);

      return {
        meta: {
          title: data.title || formatTitle(slug[slug.length - 1] || 'Home'),
          description: data.description,
          slug: slugPath,
        },
        content: mdxContent,
      };
    }
  }

  return null;
}

// Get all slugs for static generation
export function getAllDocSlugs(): string[][] {
  const slugs: string[][] = [];

  function walkDir(dir: string, prefix: string[] = []) {
    if (!fs.existsSync(dir)) return;

    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        walkDir(filePath, [...prefix, file]);
      } else if (file.endsWith('.mdx') || file.endsWith('.md')) {
        const name = file.replace(/\.(mdx|md)$/, '');
        if (name === 'index') {
          // Skip root index.mdx - handled by app/page.tsx
          if (prefix.length > 0) {
            slugs.push(prefix);
          }
        } else {
          slugs.push([...prefix, name]);
        }
      }
    }
  }

  walkDir(contentDirectory);
  return slugs;
}

// Format a filename to a title
function formatTitle(name: string): string {
  return name
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
