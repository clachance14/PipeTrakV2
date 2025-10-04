# PipeTrak V2

Industrial pipe tracking system for brownfield construction projects.

## Foundation Setup ✅

The project foundation has been successfully initialized with:

- **React 18** + **TypeScript 5** (strict mode)
- **Vite** (build tool)
- **Tailwind CSS v4** (styling)
- **Supabase** (backend, database, auth)
- **TanStack Query** (server state)
- **TanStack Virtual** (table virtualization)
- **Zustand** (client state)
- **React Router** (routing)
- **Vitest** + **Testing Library** (testing)

## Getting Started

### Prerequisites

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Copy `.env.example` to `.env` and add your Supabase credentials

### Development

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/       # React components
│   └── ui/          # Shadcn/ui components (to be added)
├── contexts/        # React contexts (AuthContext)
├── hooks/           # Custom React hooks
├── lib/             # Utilities and clients
│   ├── supabase.ts  # Supabase client
│   └── utils.ts     # Helper functions
├── pages/           # Route pages
│   ├── LoginPage.tsx
│   └── DashboardPage.tsx
├── types/           # TypeScript types
│   ├── index.ts     # Domain types
│   └── database.types.ts  # Supabase generated types
└── App.tsx          # Root component with routing
```

## Next Steps

Now that the foundation is ready, you can:

1. **Set up the constitution** - Define your development principles in `.specify/memory/constitution.md`
2. **Create your first feature spec** - Use `/specify` to create a feature specification
3. **Generate implementation plan** - Use `/plan` to create design artifacts
4. **Break down into tasks** - Use `/tasks` to create actionable task list
5. **Start implementing** - Use `/implement` to execute the plan

## Tech Stack Details

### Frontend
- **React 18** - UI framework
- **TypeScript 5** - Type safety (strict mode enabled)
- **Vite** - Fast build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS
- **React Router v7** - Client-side routing
- **Radix UI** - Accessible component primitives

### Backend (Supabase)
- **PostgreSQL 15+** - Relational database
- **PostgREST** - Auto-generated REST API
- **Row Level Security** - Multi-tenant security
- **Realtime** - WebSocket subscriptions
- **Auth** - Email/password authentication
- **Storage** - File uploads

### State Management
- **TanStack Query** - Server state, caching, sync
- **Zustand** - Lightweight client state
- **React Context** - Auth state

### Testing
- **Vitest** - Fast unit test runner
- **Testing Library** - Component testing
- **jsdom** - DOM environment for tests

## Configuration Files

- `tsconfig.json` - TypeScript strict mode, path aliases (`@/*`)
- `vite.config.ts` - Vite with React plugin, path aliases
- `tailwind.config.js` - Tailwind theme configuration
- `vitest.config.ts` - Test environment setup
- `components.json` - Shadcn/ui configuration

## Build Status

✅ TypeScript compiles without errors
✅ Production build succeeds
✅ Dev server starts successfully
✅ All dependencies installed

---

**Ready to start building features with the Specify workflow!**
