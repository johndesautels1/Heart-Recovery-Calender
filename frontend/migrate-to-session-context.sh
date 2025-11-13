#!/bin/bash

# Migration script: AuthContext → SessionContext
# This script updates all imports and usages to use the new unified SessionContext

cd "$(dirname "$0")/src"

# List of files to update
files=(
  "./components/auth/ProtectedRoute.tsx"
  "./components/CompleteProfileModal.tsx"
  "./components/GlobalHAWKAlert.tsx"
  "./components/GlobalWaterButton.tsx"
  "./components/GlobalWeatherWidget.tsx"
  "./components/layout/Navbar.tsx"
  "./components/LiveVitalsDisplay.tsx"
  "./components/PatientSelector.tsx"
  "./contexts/PatientSelectionContext.tsx"
  "./contexts/ViewContext.tsx"
  "./contexts/WebSocketContext.tsx"
  "./pages/CalendarPage.tsx"
  "./pages/DashboardPage.tsx"
  "./pages/DevicesPage.tsx"
  "./pages/EventTemplatesPage.tsx"
  "./pages/ExercisesPage.tsx"
  "./pages/LoginPage.tsx"
  "./pages/MealsPage.tsx"
  "./pages/MedicationsPage.tsx"
  "./pages/MyProvidersPage.tsx"
  "./pages/PatientProfilePage.tsx"
  "./pages/ProfilePage.tsx"
  "./pages/ProfilePage_old.tsx"
  "./pages/RegisterPage.tsx"
  "./pages/SleepPage.tsx"
  "./pages/VitalsPage.tsx"
)

echo "Migrating ${#files[@]} files from AuthContext to SessionContext..."

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "  Updating: $file"

    # Replace import statements
    sed -i "s/import { useAuth }/import { useSession }/g" "$file"
    sed -i "s/from '\.\.\/contexts\/AuthContext'/from '..\/contexts\/SessionContext'/g" "$file"
    sed -i "s/from '\.\.\/\.\.\/contexts\/AuthContext'/from '..\/..\/contexts\/SessionContext'/g" "$file"
    sed -i "s/from '\.\/contexts\/AuthContext'/from '.\/contexts\/SessionContext'/g" "$file"
    sed -i "s/from '\.\/AuthContext'/from '.\/SessionContext'/g" "$file"

    # Replace hook usage
    sed -i "s/useAuth()/useSession()/g" "$file"
    sed -i "s/= useAuth;/= useSession;/g" "$file"

  else
    echo "  ⚠️  File not found: $file"
  fi
done

echo "✅ Migration complete!"
echo ""
echo "Next steps:"
echo "1. Review changes with: git diff"
echo "2. Test the application"
echo "3. Commit changes"
