export const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;
export const isDesktop = isTauri;

export interface FileOpenResult {
  content: string;
  name: string;
}

export interface FileSaveOptions {
  content: string;
  suggestedName: string;
  extensions: string[];
}

export interface FolderSelectResult {
  path: string;
  canceled: boolean;
}

export async function openFile(extensions?: string[]): Promise<FileOpenResult> {
  if (isTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const { readTextFile } = await import('@tauri-apps/plugin-fs');
    const selected = await open({
      multiple: false,
      filters: extensions ? [{ name: '文件', extensions }] : undefined,
    });
    if (!selected) {
      throw new Error('AbortError');
    }
    const path = selected as string;
    const content = await readTextFile(path);
    return { content, name: path.split('/').pop() || path.split('\\').pop() || 'file' };
  } else {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = extensions ? extensions.map(e => `.${e}`).join(',') : '';
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { reject(new Error('AbortError')); return; }
        const content = await file.text();
        resolve({ content, name: file.name });
      };
      input.oncancel = () => reject(new Error('AbortError'));
      input.click();
    });
  }
}

export async function saveFile(options: FileSaveOptions): Promise<string | null> {
  if (isTauri) {
    const { save } = await import('@tauri-apps/plugin-dialog');
    const { writeFile } = await import('@tauri-apps/plugin-fs');
    const filePath = await save({
      defaultPath: options.suggestedName,
      filters: [{ name: '文件', extensions: options.extensions }],
    });
    if (!filePath) {
      return null;
    }
    const encoder = new TextEncoder();
    await writeFile(filePath as string, encoder.encode(options.content));
    return filePath as string;
  } else {
    const blob = new Blob([options.content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = options.suggestedName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return options.suggestedName;
  }
}

export async function selectFolder(): Promise<FolderSelectResult> {
  if (isTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({
      directory: true,
      multiple: false,
      title: '选择工作区文件夹'
    });
    if (!selected) {
      return { path: '', canceled: true };
    }
    return { path: selected as string, canceled: false };
  } else {
    return { path: '', canceled: true };
  }
}

export async function writeToWorkspace(workspacePath: string, fileName: string, content: string): Promise<boolean> {
  if (isTauri && workspacePath) {
    try {
      const { writeFile } = await import('@tauri-apps/plugin-fs');
      const encoder = new TextEncoder();
      await writeFile(`${workspacePath}/${fileName}`, encoder.encode(content));
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function readWorkspaceFiles(workspacePath: string): Promise<{ name: string; path: string }[]> {
  if (isTauri && workspacePath) {
    try {
      const { readDir } = await import('@tauri-apps/plugin-fs');
      const entries = await readDir(workspacePath);
      return entries
        .filter(e => e.isFile && (e.name?.endsWith('.md') || e.name?.endsWith('.markdown') || e.name?.endsWith('.txt')))
        .map(e => ({ name: e.name || '', path: `${workspacePath}/${e.name}` }));
    } catch {
      return [];
    }
  }
  return [];
}
