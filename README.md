# Gaming Platform Admin Dashboard

A comprehensive React-based admin dashboard for managing gaming platforms. This application provides a complete interface for managing games, contests, banners, users, and analytics.

## 🚀 Features

### ✅ Completed Features
- **Authentication System**: Secure login with session management
- **Dashboard**: Overview with statistics and recent activities
- **Games Management**: Complete CRUD operations for games
- **Contests Management**: Full contest lifecycle management
- **Banner Management**: Image upload and banner scheduling
- **Responsive Design**: Mobile-first responsive interface
- **Modern UI**: Clean, professional design with Tailwind CSS

### 🔄 Planned Features
- **User Management**: User roles and permissions
- **Reports & Analytics**: Detailed insights and metrics
- **Settings**: Platform configuration and preferences
- **Notifications**: Real-time notification system

## 🛠️ Tech Stack

- **Frontend**: React 18, React Router v6
- **Styling**: Tailwind CSS with custom components
- **HTTP Client**: Axios with interceptors
- **State Management**: React Context API
- **Notifications**: React Toastify
- **Icons**: Heroicons (SVG)
- **Build Tool**: Create React App

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/gaming-platform-admin.git
   cd gaming-platform-admin
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Configuration**
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_API_URL=https://your-api-url.com/api/
   REACT_APP_S3_URL=https://your-s3-bucket.com/
   ```

4. **Install Tailwind CSS plugins**
   ```bash
   npm install -D @tailwindcss/forms @tailwindcss/typography @tailwindcss/aspect-ratio
   ```

5. **Start the development server**
   ```bash
   npm start
   # or
   yarn start
   ```

6. **Build for production**
   ```bash
   npm run build
   # or
   yarn build
   ```

## 📁 Project Structure

```
src/
├── components/          # Reusable UI components
├── context/            # React Context providers
│   └── storeContext.jsx
├── pages/              # Main application pages
│   ├── Login.jsx
│   ├── Dashboard.jsx
│   ├── Games.jsx
│   └── Contests.jsx
├── partials/           # Layout components
│   ├── Sidebar.jsx
│   └── Header.jsx
├── axiosInstance.js    # HTTP client configuration
├── index.css          # Global styles and Tailwind imports
├── index.js           # Application entry point
├── App.js             # Main application component
└── Banner.jsx         # Banner management component
```

## 🔧 Configuration

### API Configuration
The application uses axios for API communication. Configure your API endpoints in:
- Base URL: `REACT_APP_API_URL` environment variable
- S3 URL: `REACT_APP_S3_URL` environment variable

### Authentication
The app uses cookie-based authentication with the following cookies:
- `isLoggedIn`: Boolean flag for authentication status
- `userToken`: JWT token for API requests
- `userData`: Serialized user information

## 📱 Pages Overview

### 🔐 Login Page
- Secure authentication form
- Form validation
- Password visibility toggle
- Automatic redirect for authenticated users

### 📊 Dashboard
- Platform statistics overview
- Recent activities feed
- Top performing games
- Quick navigation cards

### 🎮 Games Management
- Grid/card view of all games
- Add/Edit game modal with image upload
- Game categorization
- Status management (Active/Inactive)
- Search and filtering capabilities

### 🏆 Contests Management
- Comprehensive contest lifecycle management
- Game association
- Participant limits and prize pools
- Real-time status (Upcoming/Live/Ended)
- Advanced filtering options

### 🎨 Banner Management
- Image upload with preview
- Scheduling system
- Game and contest association
- Status management

## 🎨 UI Components

### Custom Button Classes
```css
.btn              /* Base button styles */
.btn-primary      /* Primary blue button */
.btn-secondary    /* Gray button */
.btn-success      /* Green button */
.btn-danger       /* Red button */
.btn-warning      /* Yellow button */
.btn-outline      /* Outlined button */
```

### Form Components
```css
.form-input       /* Styled input fields */
.form-select      /* Styled select dropdowns */
.form-textarea    /* Styled textareas */
.form-checkbox    /* Styled checkboxes */
.form-radio       /* Styled radio buttons */
```

### Card Components
```css
.card             /* Base card container */
.card-header      /* Card header section */
.card-body        /* Card content area */
.card-footer      /* Card footer section */
```

## 🔒 Security Features

- JWT token authentication
- Automatic session expiry handling
- Protected routes
- CSRF protection ready
- Input validation and sanitization

## 📱 Responsive Design

- Mobile-first approach
- Collapsible sidebar for mobile
- Touch-friendly interface
- Optimized for tablets and desktops

## 🚀 Performance Optimizations

- Code splitting with React.lazy (planned)
- Image optimization
- Efficient re-rendering with React.memo
- Debounced search functionality
- Lazy loading for large datasets

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run tests in watch mode
npm test -- --watch
```

## 📈 Build and Deployment

### Development Build
```bash
npm start
```

### Production Build
```bash
npm run build
```

### Deployment Options
- **Netlify**: Connect your GitHub repo for automatic deployments
- **Vercel**: Zero-config deployment with GitHub integration
- **AWS S3 + CloudFront**: Static hosting with CDN
- **Docker**: Containerized deployment

### Docker Deployment
```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 Code Style

- Use ESLint and Prettier for code formatting
- Follow React best practices
- Use functional components with hooks
- Implement proper error boundaries
- Write meaningful commit messages

## 🐛 Troubleshooting

### Common Issues

1. **Module not found errors**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Tailwind styles not loading**
   - Ensure `@tailwind` directives are in `src/index.css`
   - Check `tailwind.config.js` content paths

3. **API connection issues**
   - Verify `REACT_APP_API_URL` in `.env`
   - Check CORS settings on your backend

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Team

- **Frontend Developer**: React, Tailwind CSS, UI/UX
- **Backend Integration**: API design, authentication
- **DevOps**: Deployment, CI/CD pipeline

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Email: support@yourcompany.com
- Documentation: [Wiki](https://github.com/yourusername/gaming-platform-admin/wiki)

## 🗺️ Roadmap

### Phase 1 (Completed)
- ✅ Authentication system
- ✅ Dashboard with statistics
- ✅ Games management
- ✅ Contests management
- ✅ Banner management

### Phase 2 (In Progress)
- 🔄 User management system
- 🔄 Advanced reporting
- 🔄 Real-time notifications
- 🔄 Settings panel

### Phase 3 (Planned)
- 📋 Advanced analytics
- 📋 Multi-language support
- 📋 Dark mode
- 📋 Mobile app
- 📋 API documentation

---

**Made with ❤️ for the gaming community**