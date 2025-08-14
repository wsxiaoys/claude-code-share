#!/bin/bash
# Status line that shows full conversation history path and project path

# Read JSON input once
input=$(cat)

# Helper functions for common extractions
get_model_name() { echo "$input" | jq -r '.model.display_name'; }
get_project_dir() { echo "$input" | jq -r '.workspace.project_dir'; }
get_history_path() { echo "$input" | jq -r '.transcript_path // empty'; }

# Use the helpers
MODEL=$(get_model_name)
PROJECT_DIR=$(get_project_dir)
HISTORY=$(get_history_path)

# Always show full paths
if [ -n "$HISTORY" ]; then
    # Show just full history path
    echo "[$MODEL] History: $HISTORY"
elif [ -n "$PROJECT_DIR" ]; then
    # Show just project path
    echo "[$MODEL] Project: $PROJECT_DIR"
fi