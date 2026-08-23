#!/bin/bash
# Script to send announcement email to all users

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}PlayMatch - Send Announcement Email${NC}"
echo "===================================="
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}ERROR: .env.local file not found${NC}"
    echo "Please create .env.local with ADMIN_API_TOKEN set"
    exit 1
fi

# Load environment variables
export $(grep -v '^#' .env.local | xargs)

# Check if ADMIN_API_TOKEN is set
if [ -z "$ADMIN_API_TOKEN" ]; then
    echo -e "${RED}ERROR: ADMIN_API_TOKEN not set in .env.local${NC}"
    exit 1
fi

# Determine API URL
if [ "$1" == "prod" ]; then
    API_URL="https://playmatch.games/api/send-announcement"
    echo -e "${YELLOW}Sending to PRODUCTION${NC}"
else
    API_URL="http://localhost:3000/api/send-announcement"
    echo -e "${YELLOW}Sending to LOCAL (dev server must be running)${NC}"
fi

echo ""
echo -e "${YELLOW}⚠️  WARNING: This will email ALL users in the database${NC}"
echo ""
read -p "Are you sure you want to continue? (type 'yes' to confirm): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cancelled."
    exit 0
fi

echo ""
echo "Sending announcement..."
echo ""

# Send the request
response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ADMIN_API_TOKEN")

# Extract HTTP status code and body
http_code=$(echo "$response" | tail -n1)
body=$(echo "$response" | sed '$d')

echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
echo ""

if [ "$http_code" -eq 200 ]; then
    echo -e "${GREEN}✅ Announcement sent successfully!${NC}"
else
    echo -e "${RED}❌ Failed to send announcement (HTTP $http_code)${NC}"
    exit 1
fi
