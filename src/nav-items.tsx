
import Index from "./pages/Index";
import IngredientsPage from "./pages/IngredientsPage";
import ProductsPage from "./pages/ProductsPage";
import RecipePage from "./pages/RecipePage";
import Analytics from "./pages/Analytics";
import ProductionPage from "./pages/ProductionPage";
import ProductionCostPage from "./pages/ProductionCostPage";
import StockPage from "./pages/StockPage";
import PromotionsPage from "./pages/PromotionsPage";
import ExpiredStockPage from "./pages/ExpiredStockPage";
import UserManual from "./pages/UserManual";
import UserManagementPage from "./pages/UserManagementPage";

export const navItems = [
  {
    to: "/",
    page: <Index />,
  },
  {
    to: "/ingredients",
    page: <IngredientsPage />,
  },
  {
    to: "/products",
    page: <ProductsPage />,
  },
  {
    to: "/recipes",
    page: <RecipePage />,
  },
  {
    to: "/suppliers",
    page: <div>Suppliers Page</div>,
  },
  {
    to: "/customers",
    page: <div>Customers Page</div>,
  },
  {
    to: "/sales",
    page: <div>Sales Page</div>,
  },
  {
    to: "/expenses",
    page: <div>Expenses Page</div>,
  },
  {
    to: "/inventory",
    page: <div>Inventory Page</div>,
  },
  {
    to: "/reports",
    page: <div>Reports Page</div>,
  },
  {
    to: "/production",
    page: <ProductionPage />,
  },
  {
    to: "/production-cost",
    page: <ProductionCostPage />,
  },
  {
    to: "/stock",
    page: <StockPage />,
  },
  {
    to: "/promotions",
    page: <PromotionsPage />,
  },
  {
    to: "/expired",
    page: <ExpiredStockPage />,
  },
  {
    to: "/analytics",
    page: <Analytics />,
  },
  {
    to: "/manual",
    page: <UserManual />,
  },
  {
    to: "/user-management",
    page: <UserManagementPage />,
  },
];
