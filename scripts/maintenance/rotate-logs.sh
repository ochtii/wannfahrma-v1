#!/bin/bash
# Warten is ORG - Log Rotation Script

APP_DIR="/home/ubuntu/wannfahrma-v1"
LOG_DIR="$APP_DIR/logs"
MAX_SIZE="10M"
KEEP_DAYS=7

echo "🔄 Starting log rotation for Warten is ORG..."

# Function to rotate a single log file
rotate_log() {
    local logfile="$1"
    local basename=$(basename "$logfile" .log)
    local timestamp=$(date +%Y%m%d_%H%M%S)
    
    if [ -f "$logfile" ]; then
        local size=$(stat -f%z "$logfile" 2>/dev/null || stat -c%s "$logfile" 2>/dev/null)
        local max_bytes=$(echo "$MAX_SIZE" | sed 's/M/*1024*1024/g' | bc)
        
        if [ "$size" -gt "$max_bytes" ]; then
            echo "📦 Rotating $logfile ($(du -h "$logfile" | cut -f1))"
            
            # Move current log
            mv "$logfile" "${logfile}.${timestamp}"
            
            # Compress old log
            gzip "${logfile}.${timestamp}"
            
            # Create new empty log
            touch "$logfile"
            chmod 644 "$logfile"
            
            echo "✅ Rotated: ${basename}.log -> ${basename}.log.${timestamp}.gz"
        fi
    fi
}

# Rotate all log files
for logfile in "$LOG_DIR"/*.log; do
    [ -f "$logfile" ] && rotate_log "$logfile"
done

# Clean up old compressed logs
echo "🧹 Cleaning up logs older than $KEEP_DAYS days..."
find "$LOG_DIR" -name "*.log.*.gz" -mtime +$KEEP_DAYS -delete

# PM2 logs
echo "🔄 Flushing PM2 logs..."
pm2 flush wannfahrma 2>/dev/null || true
pm2 flush wannfahrma-feedback 2>/dev/null || true

echo "✅ Log rotation completed!"
