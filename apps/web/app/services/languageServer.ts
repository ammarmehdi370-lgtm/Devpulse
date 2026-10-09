export interface LanguageCompletionRequest {
  language: "python" | "java" | "go" | "cpp";
  prefix: string;
}

export interface LanguageCompletion {
  label: string;
  insertText: string;
  detail: string;
}

const MOCK_COMPLETIONS: Record<
  LanguageCompletionRequest["language"],
  LanguageCompletion[]
> = {
  python: [
    { label: "print", insertText: "print()", detail: "Python output" },
    { label: "def", insertText: "def function_name():", detail: "Function" },
  ],
  java: [
    {
      label: "System.out.println",
      insertText: "System.out.println();",
      detail: "Print to standard output",
    },
    {
      label: "public class",
      insertText: "public class Name {}",
      detail: "Class",
    },
  ],
  go: [
    {
      label: "fmt.Println",
      insertText: "fmt.Println()",
      detail: "Print a line",
    },
    { label: "func", insertText: "func name() {", detail: "Function" },
  ],
  cpp: [
    {
      label: "std::cout",
      insertText: "std::cout << value << std::endl;",
      detail: "Write to standard output",
    },
    {
      label: "for",
      insertText: "for (int i = 0; i < count; ++i) {",
      detail: "For loop",
    },
  ],
};

// TODO: Replace this local preview with completion requests to the language-server backend.
export const getLanguageServerCompletions = async ({
  language,
  prefix,
}: LanguageCompletionRequest): Promise<LanguageCompletion[]> => {
  const normalizedPrefix = prefix.toLowerCase();
  return MOCK_COMPLETIONS[language].filter((completion) =>
    completion.label.toLowerCase().startsWith(normalizedPrefix),
  );
};
