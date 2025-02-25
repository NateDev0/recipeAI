# Recipe AI

A smart, AI-powered recipe and meal planning application that helps you cook delicious meals based on the ingredients you already have.

![Recipe AI](https://images.pexels.com/photos/1640774/pexels-photo-1640774.jpeg)

## Features

- **AI-Powered Recipe Suggestions** - Get personalized recipe recommendations based on ingredients in your pantry
- **Smart Pantry Management** - Keep track of your ingredients and their quantities
- **Meal Planner** - Plan your meals for the week with an interactive calendar
- **Recurring Meal Plans** - Set up recurring meals for specific days of the week
- **Recipe Discovery** - Find and save new recipes to try
- **User Profiles** - Secure authentication and personalized experience

## Tech Stack

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL database)
- **AI Integration**: Google's Gemini AI for recipe generation
- **Authentication**: Supabase Auth
- **Image Search**: Apify for recipe images
- **Styling**: Tailwind CSS with custom components
- **Icons**: Lucide React

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Supabase account
- Google AI Platform account (for Gemini API access)
- Apify account (for image search)

## Getting Started

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/recipeAI.git
cd recipeAI/project
```

2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables:

Create a `.env` file in the project directory with the following variables:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

4. Run the development server:

```bash
npm run dev
# or
yarn dev
```

The application should now be running at http://localhost:5173

### Database Setup

This project uses Supabase for the database. The migrations are located in the `supabase/migrations` directory.

To set up the database:

1. Install the Supabase CLI
2. Link your project: `supabase link --project-ref your-project-id`
3. Apply migrations: `supabase db push`

## Features Explained

### AutoChef

The AutoChef feature generates recipes based on ingredients in your pantry:

1. Add ingredients to your pantry in the "My Pantry" section
2. Navigate to the "AutoChef" tab
3. Apply filters (optional) for cooking time, difficulty, dietary restrictions, etc.
4. Get personalized recipe suggestions
5. View complete recipe details including instructions and ingredient amounts

### Meal Planner

The Meal Planner helps you organize your meals for the week:

1. Navigate to the "Meal Planner" tab
2. Browse through weeks using navigation buttons
3. Add recipes to breakfast, lunch, or dinner slots
4. View recipe details directly from the planner
5. Make plans recurring for specific days of the week

### My Pantry

Keep track of your ingredients:

1. Add new ingredients with quantities and units
2. Update quantities as you use ingredients
3. Mark items as out of stock
4. AutoChef will use this information to suggest recipes

## Environment Variables

| Variable | Description |
|----------|-------------|
| VITE_SUPABASE_URL | URL of your Supabase project |
| VITE_SUPABASE_ANON_KEY | Anon/public key for Supabase |
| VITE_GEMINI_API_KEY | API key for Google's Gemini AI |

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google's Gemini AI for recipe generation capabilities
- Supabase for the backend infrastructure
- Apify for image search functionality
- All the open-source libraries used in this project 