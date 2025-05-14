#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Workforce Manager Deployment Script${NC}"
echo -e "${YELLOW}==================================${NC}"

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "Git is not installed. Please install git first."
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
    echo "Not in a git repository. Please run this script from the root of your git repository."
    exit 1
fi

# Make sure we're on the main branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo -e "${YELLOW}Warning: You are not on the main/master branch. Current branch: $CURRENT_BRANCH${NC}"
    read -p "Do you want to continue with deployment? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${YELLOW}Warning: You have uncommitted changes.${NC}"
    read -p "Do you want to commit these changes before deploying? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Enter commit message: " commit_message
        git add .
        git commit -m "$commit_message"
    fi
fi

# Push to GitHub
echo -e "${GREEN}Pushing code to GitHub...${NC}"
git push

echo -e "${GREEN}Deployment initiated!${NC}"
echo -e "${GREEN}Your code has been pushed to GitHub.${NC}"
echo -e "${GREEN}If you have set up automatic deployments:${NC}"
echo -e "  - Backend will deploy to Render automatically"
echo -e "  - Frontend will deploy to Vercel automatically"
echo
echo -e "${YELLOW}Manual deployment links:${NC}"
echo -e "  - Render Dashboard: https://dashboard.render.com/"
echo -e "  - Vercel Dashboard: https://vercel.com/dashboard"
echo
echo -e "${GREEN}Deployment process completed!${NC}" 