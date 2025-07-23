export type BashTool = {
  content: [
    {
      type: "tool_use";
      id: "toolu_0132Hq6KJWoN1vrfMmNypdFs";
      name: "Bash";
      input: {
        command: "npm install -D tailwindcss postcss autoprefixer";
        description: "Install Tailwind CSS dependencies";
      };
    }
  ];
};

export type WebFetchTool = {
  content: [
    {
      type: "tool_use";
      id: "toolu_01TAEnzMcn7em6B5BMWxxpNx";
      name: "WebFetch";
      input: {
        url: "https://www.foxychat.net/";
        prompt: "Analyze this landing page and describe its layout, sections, components, colors, typography, and overall design. Focus on the structure and visual elements that need to be recreated.";
      };
    }
  ];
};

export type WebSearchTool = {
  content: [
    {
      type: "tool_use";
      id: "toolu_0134rcFv5bFM6jXxKEMAB23H";
      name: "WebSearch";
      input: {
        query: "foxychat.net AI agent computer landing page design layout";
      };
    }
  ];
};

export type LSTool = {
  content: [
    {
      type: "tool_use";
      id: "toolu_01HSQZfQFqvRqrWyDdEV7ywp";
      name: "LS";
      input: {
        path: "/Volumes/1T_Mac_Disk/code/pochi_landing_page_test";
      };
    }
  ];
};

export type ToDoTool = {
  content: [
    {
      type: "tool_use";
      id: "toolu_016nTCPbrTApUGkn64vbvn88";
      name: "TodoWrite";
      input: {
        todos: [
          {
            id: "1";
            content: "Initialize React + TypeScript + Tailwind project";
            status: "pending";
            priority: "high";
          },
          {
            id: "2";
            content: "Analyze FoxyChat website structure and design";
            status: "pending";
            priority: "high";
          },
          {
            id: "3";
            content: "Create basic project structure and components";
            status: "pending";
            priority: "medium";
          },
          {
            id: "4";
            content: "Implement header/navigation section";
            status: "pending";
            priority: "medium";
          },
          {
            id: "5";
            content: "Implement hero section with main messaging";
            status: "pending";
            priority: "medium";
          },
          {
            id: "6";
            content: "Implement features/benefits sections";
            status: "pending";
            priority: "medium";
          },
          {
            id: "7";
            content: "Implement footer section";
            status: "pending";
            priority: "low";
          },
          {
            id: "8";
            content: "Add responsive design and polish styling";
            status: "pending";
            priority: "low";
          }
        ];
      };
    }
  ];
};

export type TaskTool = {
  content: [
    {
      type: "tool_use";
      id: "toolu_01FxQ8hg3WwHSZz6BEfMr1NL";
      name: "Task";
      input: {
        description: "Research FoxyChat website";
        prompt: "Visit https://www.foxychat.net/ and provide a comprehensive analysis of the landing page design, including:\n\n1. Overall layout and structure\n2. Header/navigation design \n3. Hero section content and design\n4. Main sections and their content\n5. Visual elements, colors, fonts\n6. Call-to-action buttons\n7. Footer design\n8. Any animations or interactive elements\n9. Responsive design considerations\n\nFocus on extracting specific design details that would be needed to recreate this landing page using React, TypeScript, and Tailwind CSS. Include exact text content, color schemes, spacing, and layout patterns.";
      };
    }
  ];
};

export type WriteTool = {
  content: [
    {
      type: "tool_use";
      id: "toolu_01GPbfqdyYZ8KjrVF8qEFB4Z";
      name: "Write";
      input: {
        file_path: "/Volumes/1T_Mac_Disk/code/pochi_landing_page_test/foxychat-clone/postcss.config.js";
        content: "export default {\n  plugins: {\n    tailwindcss: {},\n    autoprefixer: {},\n  },\n}";
      };
    }
  ];
};

export type ReadTool = {
  content: [
    {
      type: "tool_use";
      id: "toolu_01NoybmkED6fBqDow2Kb6sjN";
      name: "Read";
      input: {
        file_path: "/Volumes/1T_Mac_Disk/code/pochi_landing_page_test/foxychat-clone/src/index.css";
      };
    }
  ];
};

export type EditTool = {
  content: [
    {
      type: "tool_use";
      id: "toolu_0175qphCDo4a9hsuLXxs45zR";
      name: "Edit";
      input: {
        file_path: "/Volumes/1T_Mac_Disk/code/pochi_landing_page_test/foxychat-clone/src/index.css";
        old_string: ":root {\n  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;\n  line-height: 1.5;\n  font-weight: 400;\n\n  color-scheme: light dark;\n  color: rgba(255, 255, 255, 0.87);\n  background-color: #242424;\n\n  font-synthesis: none;\n  text-rendering: optimizeLegibility;\n  -webkit-font-smoothing: antialiased;\n  -moz-osx-font-smoothing: grayscale;\n}\n\na {\n  font-weight: 500;\n  color: #646cff;\n  text-decoration: inherit;\n}\na:hover {\n  color: #535bf2;\n}\n\nbody {\n  margin: 0;\n  display: flex;\n  place-items: center;\n  min-width: 320px;\n  min-height: 100vh;\n}\n\nh1 {\n  font-size: 3.2em;\n  line-height: 1.1;\n}\n\nbutton {\n  border-radius: 8px;\n  border: 1px solid transparent;\n  padding: 0.6em 1.2em;\n  font-size: 1em;\n  font-weight: 500;\n  font-family: inherit;\n  background-color: #1a1a1a;\n  cursor: pointer;\n  transition: border-color 0.25s;\n}\nbutton:hover {\n  border-color: #646cff;\n}\nbutton:focus,\nbutton:focus-visible {\n  outline: 4px auto -webkit-focus-ring-color;\n}\n\n@media (prefers-color-scheme: light) {\n  :root {\n    color: #213547;\n    background-color: #ffffff;\n  }\n  a:hover {\n    color: #747bff;\n  }\n  button {\n    background-color: #f9f9f9;\n  }\n}";
        new_string: "@tailwind base;\n@tailwind components;\n@tailwind utilities;";
      };
    }
  ];
};
