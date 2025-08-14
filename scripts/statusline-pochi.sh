#!/bin/bash
# Claude Code statusline with Pochi share link
# This script generates and caches Pochi links for conversations

# Cache configuration
CACHE_DIR="$HOME/.cache/claude-code-share"
CACHE_EXPIRY=$((24 * 60 * 60)) # 24 hours in seconds

# Ensure cache directory exists
mkdir -p "$CACHE_DIR"

# Read JSON input
input=$(cat)

# Extract fields from JSON
get_model_name() { echo "$input" | jq -r '.model.display_name'; }
get_project_dir() { echo "$input" | jq -r '.workspace.project_dir'; }
get_history_path() { echo "$input" | jq -r '.transcript_path'; }

MODEL=$(get_model_name)
PROJECT_DIR=$(get_project_dir)
HISTORY_PATH=$(get_history_path)

# Function to get file hash
get_file_hash() {
    local file="$1"
    if [ -f "$file" ]; then
        md5sum "$file" 2>/dev/null | cut -d' ' -f1 || md5 -q "$file" 2>/dev/null || echo "nohash"
    else
        echo "nofile"
    fi
}

# Function to get cached Pochi link
get_cached_link() {
    local history_path="$1"
    local file_hash=$(get_file_hash "$history_path")
    local cache_file="$CACHE_DIR/$(basename "$history_path" .jsonl)-${file_hash}.cache"
    
    if [ -f "$cache_file" ]; then
        # Check if cache is not expired (modified within last 24 hours)
        if [ "$(find "$cache_file" -mtime -1 2>/dev/null)" ]; then
            cat "$cache_file"
            return 0
        else
            rm -f "$cache_file"
        fi
    fi
    return 1
}

# Function to save link to cache
save_to_cache() {
    local history_path="$1"
    local pochi_link="$2"
    local file_hash=$(get_file_hash "$history_path")
    local cache_file="$CACHE_DIR/$(basename "$history_path" .jsonl)-${file_hash}.cache"
    
    echo "$pochi_link" > "$cache_file"
}

# Function to generate Pochi link
generate_pochi_link() {
    local history_path="$1"
    
    # Get script directory and project root
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
    
    # Try to run the CLI to generate link
    if [ -f "$PROJECT_ROOT/src/cli.ts" ]; then
        # Use bun if available, otherwise try node
        if command -v bun &> /dev/null; then
            result=$(cd "$PROJECT_ROOT" && bun run src/cli.ts "$history_path" 2>&1)
            exit_code=$?
        elif [ -f "$PROJECT_ROOT/dist/cli.js" ]; then
            result=$(cd "$PROJECT_ROOT" && node dist/cli.js "$history_path" 2>&1)
            exit_code=$?
        else
            echo "Debug: No CLI executable found" >&2
            return 1
        fi
        
        # Debug: Log CLI execution details
        if [ $exit_code -ne 0 ]; then
            echo "Debug: CLI failed with exit code $exit_code" >&2
            echo "Debug: CLI output: $result" >&2
            return 1
        fi
        
        # Extract the share link from output
        link=$(echo "$result" | grep -o 'https://app\.getpochi\.com/clips/[a-zA-Z0-9]*' | head -1)
        if [ -z "$link" ]; then
            echo "Debug: No Pochi link found in CLI output" >&2
            echo "Debug: Full CLI output: $result" >&2
        fi
        echo "$link"
    else
        echo "Debug: CLI file not found at $PROJECT_ROOT/src/cli.ts" >&2
        return 1
    fi
}

# Main logic
POCHI_LINK=""

if [ -n "$HISTORY_PATH" ]; then
    # Try to get cached link first
    POCHI_LINK=$(get_cached_link "$HISTORY_PATH")
    
    if [ -z "$POCHI_LINK" ]; then
        # Generate new link
        POCHI_LINK=$(generate_pochi_link "$HISTORY_PATH")
        
        if [ -n "$POCHI_LINK" ]; then
            # Save to cache
            save_to_cache "$HISTORY_PATH" "$POCHI_LINK"
        else
            # Debug: Log why link generation failed
            echo "Debug: Failed to generate Pochi link for $HISTORY_PATH" >&2
        fi
    fi
fi

# Build status line output
if [ -n "$POCHI_LINK" ]; then
    # Show URL
    echo "[$MODEL] 🔗 pochi: $POCHI_LINK"
elif [ -n "$HISTORY_PATH" ] && [ -n "$PROJECT_DIR" ]; then
    # Show paths if no Pochi link available
    echo "[$MODEL] 📜 $HISTORY_PATH | 📁 ${PROJECT_DIR##*/}"
fi