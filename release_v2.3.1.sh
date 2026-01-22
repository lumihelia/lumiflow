#!/bin/bash
# LumiFlow v2.3.1 Release Script
# Auto-commit, tag, and push to GitHub

echo "🚀 LumiFlow v2.3.1 Release Script"
echo "=================================="
echo ""

# 1. Show git status
echo "📊 Current Git Status:"
git status
echo ""

# 2. Confirm release
read -p "Ready to release v2.3.1? (y/n): " confirm
if [ "$confirm" != "y" ]; then
    echo "❌ Release cancelled"
    exit 0
fi
echo ""

# 3. Add all files
echo "📦 Adding files to git..."
git add .
echo "✅ Files added"
echo ""

# 4. Commit with message
echo "💾 Creating commit..."
git commit -F GIT_COMMIT_MESSAGE.txt
if [ $? -eq 0 ]; then
    echo "✅ Commit created"
else
    echo "⚠️  Commit failed or no changes to commit"
fi
echo ""

# 5. Create tag
echo "🏷️  Creating tag v2.3.1..."
git tag -a v2.3.1 -m "LumiFlow v2.3.1: Bug fixes & COPY ALL improvements"
if [ $? -eq 0 ]; then
    echo "✅ Tag created"
else
    echo "⚠️  Tag creation failed (may already exist)"
fi
echo ""

# 6. Push to GitHub
read -p "Push to GitHub? (y/n): " push_confirm
if [ "$push_confirm" = "y" ]; then
    echo "📤 Pushing to GitHub..."
    git push origin main
    git push origin v2.3.1
    echo "✅ Pushed to GitHub"
else
    echo "⏸️  Skipped GitHub push (you can do it manually later)"
fi
echo ""

# 7. Create release ZIP
echo "📦 Creating release ZIP..."
zip -r LumiFlow-v2.3.1.zip . \
  -x "*.git*" \
  -x "*node_modules*" \
  -x "LumiFlow\ 1.0/*" \
  -x "*.DS_Store" \
  -x "*GIT_COMMIT_MESSAGE.txt" \
  -x "*RELEASE_CHECKLIST.md" \
  -x "*release_v2.3.1.sh" \
  -x "*/scratchpad/*"

if [ $? -eq 0 ]; then
    echo "✅ Release ZIP created: LumiFlow-v2.3.1.zip"
    echo "   Size: $(du -h LumiFlow-v2.3.1.zip | cut -f1)"
else
    echo "⚠️  ZIP creation failed"
fi
echo ""

# 8. Next steps
echo "✨ Release Complete!"
echo ""
echo "📋 Next Steps:"
echo "1. Go to: https://github.com/lumihelia/lumiflow/releases/new"
echo "2. Select tag: v2.3.1"
echo "3. Title: LumiFlow v2.3.1 - Bug Fixes & COPY ALL Improvements"
echo "4. Copy description from: RELEASE_NOTES_v2.3.1.md"
echo "5. Upload: LumiFlow-v2.3.1.zip"
echo "6. Check 'Set as latest release'"
echo "7. Click 'Publish release'"
echo ""
echo "🎉 All done! Thank you for using LumiFlow!"
