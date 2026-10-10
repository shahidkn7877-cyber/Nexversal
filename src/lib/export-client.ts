/**
 * Client-side helper to trigger article download as PDF or Word (.docx).
 */
export async function downloadArticleDocument(params: {
  title?: string;
  content: string;
  format: 'pdf' | 'docx';
  focusKeyword?: string;
  metaDescription?: string;
}): Promise<{ success: boolean; error?: string }> {
  if (!params.content || !params.content.trim()) {
    return { success: false, error: 'Cannot export an empty article. Please write or paste some content first.' };
  }

  try {
    const res = await fetch('/api/v1/content/export', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      return {
        success: false,
        error: errJson?.error?.message || 'Failed to generate document export. Please try again.',
      };
    }

    // Extract filename from Content-Disposition header if available
    const disposition = res.headers.get('content-disposition');
    let filename = `article-export.${params.format}`;
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Network error while downloading document.',
    };
  }
}

