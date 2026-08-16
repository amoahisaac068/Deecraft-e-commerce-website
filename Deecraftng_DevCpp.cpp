#include <iostream>
#include <fstream>
#include <vector>
#include <string>
#include <algorithm>
#include <limits>

using namespace std;

// ================= USER =================
class User {
private:
    int userID;
    string username, password, email, fullName;
    bool isAdmin;

public:
    User() : userID(0), isAdmin(false) {}

    User(int id, string u, string p, string e, string f, bool admin)
        : userID(id), username(u), password(p), email(e),
          fullName(f), isAdmin(admin) {}

    int getUserID() const { return userID; }
    string getUsername() const { return username; }
    string getPassword() const { return password; }
    string getEmail() const { return email; }
    string getFullName() const { return fullName; }
    bool getIsAdmin() const { return isAdmin; }

    string toFileFormat() const {
        return to_string(userID) + "|" + username + "|" + password + "|" +
               email + "|" + fullName + "|" + (isAdmin ? "1" : "0");
    }
};

// ================= PRODUCT =================
class Product {
private:
    int productID;
    string name, description, category;
    double price;
    int stock;

public:
    Product() : productID(0), price(0), stock(0) {}

    Product(int id, string n, string d, double p, int s, string c)
        : productID(id), name(n), description(d),
          price(p), stock(s), category(c) {}

    int getProductID() const { return productID; }
    string getProductName() const { return name; }
    string getCategory() const { return category; }
    double getPrice() const { return price; }
    int getStock() const { return stock; }

    void reduceStock(int quantity) {
        if (quantity <= stock)
            stock -= quantity;
    }

    void display() const {
        cout << "\nProduct ID: " << productID
             << "\nName: " << name
             << "\nDescription: " << description
             << "\nPrice: GHS " << price
             << "\nStock: " << stock
             << "\nCategory: " << category << "\n";
    }

    string toFileFormat() const {
        return to_string(productID) + "|" + name + "|" + description + "|" +
               to_string(price) + "|" + to_string(stock) + "|" + category;
    }
};

// ================= CART ITEM =================
class CartItem {
private:
    Product product;
    int quantity;

public:
    CartItem(Product p, int q) : product(p), quantity(q) {}

    const Product& getProduct() const { return product; }
    int getQuantity() const { return quantity; }

    double getTotal() const {
        return product.getPrice() * quantity;
    }
};

// ================= CART =================
class Cart {
private:
    int cartID;
    int userID;
    vector<CartItem> items;

public:
    Cart(int id, int uid) : cartID(id), userID(uid) {}

    bool isEmpty() const {
        return items.empty();
    }

    void addItem(const Product& product, int quantity) {
        for (size_t i = 0; i < items.size(); i++) {
            if (items[i].getProduct().getProductID() ==
                product.getProductID()) {

                int newQuantity = items[i].getQuantity() + quantity;
                items.erase(items.begin() + i);
                items.push_back(CartItem(product, newQuantity));
                return;
            }
        }

        items.push_back(CartItem(product, quantity));
    }

    void removeItem(int productID) {
        for (size_t i = 0; i < items.size(); i++) {
            if (items[i].getProduct().getProductID() == productID) {
                items.erase(items.begin() + i);
                return;
            }
        }
    }

    double getTotalPrice() const {
        double total = 0;
        for (size_t i = 0; i < items.size(); i++)
            total += items[i].getTotal();
        return total;
    }

    vector<CartItem> getItems() const {
        return items;
    }

    void clear() {
        items.clear();
    }

    void display() const {
        cout << "\n=== YOUR CART ===\n";

        if (items.empty()) {
            cout << "Cart is empty.\n";
            return;
        }

        for (size_t i = 0; i < items.size(); i++) {
            cout << "\nProduct: "
                 << items[i].getProduct().getProductName()
                 << "\nQuantity: " << items[i].getQuantity()
                 << "\nPrice: GHS " << items[i].getProduct().getPrice()
                 << "\nSubtotal: GHS " << items[i].getTotal() << "\n";
        }

        cout << "\nTotal: GHS " << getTotalPrice() << "\n";
    }
};

// ================= ORDER =================
class Order {
private:
    int orderID;
    int userID;
    vector<CartItem> items;
    double totalAmount;

public:
    Order() : orderID(0), userID(0), totalAmount(0) {}

    Order(int id, int uid, vector<CartItem> i, double total)
        : orderID(id), userID(uid), items(i), totalAmount(total) {}

    int getUserID() const {
        return userID;
    }

    void display() const {
        cout << "\n============================\n";
        cout << "Order ID: " << orderID << "\n";
        cout << "User ID: " << userID << "\n";

        for (size_t i = 0; i < items.size(); i++) {
            cout << items[i].getProduct().getProductName()
                 << " x " << items[i].getQuantity()
                 << " = GHS " << items[i].getTotal() << "\n";
        }

        cout << "Total: GHS " << totalAmount << "\n";
        cout << "============================\n";
    }

    string toFileFormat() const {
        return to_string(orderID) + "|" +
               to_string(userID) + "|" +
               to_string(totalAmount);
    }
};

// ================= SYSTEM =================
class DeecraftngSystem {
private:
    vector<User> users;
    vector<Product> products;
    vector<Order> orders;

    User* currentUser;
    Cart* currentCart;

    int nextUserID;
    int nextProductID;
    int nextOrderID;
    int nextCartID;

    const string USERS_FILE = "users.txt";
    const string PRODUCTS_FILE = "products.txt";
    const string ORDERS_FILE = "orders.txt";

public:
    DeecraftngSystem()
        : currentUser(NULL), currentCart(NULL),
          nextUserID(1001), nextProductID(1),
          nextOrderID(1), nextCartID(1) {
        loadAllData();
    }

    ~DeecraftngSystem() {
        saveAllData();

        if (currentUser)
            delete currentUser;

        if (currentCart)
            delete currentCart;
    }

    // ---------- FILE OPERATIONS ----------
    vector<string> splitString(const string& str, char delimiter) const {
        vector<string> tokens;
        string token;

        for (size_t i = 0; i < str.length(); i++) {
            char c = str[i];

            if (c == delimiter) {
                tokens.push_back(token);
                token.clear();
            } else {
                token += c;
            }
        }

        tokens.push_back(token);
        return tokens;
    }

    void loadAllData() {
        loadUsers();
        loadProducts();
        loadOrders();
    }

    void saveAllData() {
        saveUsers();
        saveProducts();
        saveOrders();
    }

    void loadUsers() {
        ifstream file(USERS_FILE.c_str());
        string line;

        while (getline(file, line)) {
            if (line.empty())
                continue;

            vector<string> parts = splitString(line, '|');

            if (parts.size() >= 6) {
                User u(atoi(parts[0].c_str()),
                       parts[1], parts[2], parts[3],
                       parts[4], parts[5] == "1");

                users.push_back(u);

                nextUserID = max(nextUserID,
                                 atoi(parts[0].c_str()) + 1);
            }
        }

        file.close();
    }

    void loadProducts() {
        ifstream file(PRODUCTS_FILE.c_str());
        string line;

        while (getline(file, line)) {
            if (line.empty())
                continue;

            vector<string> parts = splitString(line, '|');

            if (parts.size() >= 6) {
                Product p(atoi(parts[0].c_str()),
                          parts[1],
                          parts[2],
                          atof(parts[3].c_str()),
                          atoi(parts[4].c_str()),
                          parts[5]);

                products.push_back(p);

                nextProductID = max(nextProductID,
                                    atoi(parts[0].c_str()) + 1);
            }
        }

        file.close();
    }

    void loadOrders() {
        ifstream file(ORDERS_FILE.c_str());
        string line;

        while (getline(file, line)) {
            if (line.empty())
                continue;

            vector<string> parts = splitString(line, '|');

            if (parts.size() >= 3) {
                int id = atoi(parts[0].c_str());
                double total = atof(parts[2].c_str());

                // The original file did not store complete order items.
                // We keep the order ID sequence intact.
                nextOrderID = max(nextOrderID, id + 1);

                (void)total;
            }
        }

        file.close();
    }

    void saveUsers() {
        ofstream file(USERS_FILE.c_str());

        for (size_t i = 0; i < users.size(); i++)
            file << users[i].toFileFormat() << endl;

        file.close();
    }

    void saveProducts() {
        ofstream file(PRODUCTS_FILE.c_str());

        for (size_t i = 0; i < products.size(); i++)
            file << products[i].toFileFormat() << endl;

        file.close();
    }

    void saveOrders() {
        ofstream file(ORDERS_FILE.c_str());

        for (size_t i = 0; i < orders.size(); i++)
            file << orders[i].toFileFormat() << endl;

        file.close();
    }

    // ---------- AUTHENTICATION ----------
    bool signup(string username, string password,
                string email, string fullName) {

        for (size_t i = 0; i < users.size(); i++) {
            if (users[i].getUsername() == username) {
                cout << "Username already exists!\n";
                return false;
            }
        }

        User newUser(nextUserID++, username, password,
                     email, fullName, false);

        users.push_back(newUser);
        saveUsers();

        cout << "Signup successful! You can now login.\n";
        return true;
    }

    bool signin(string username, string password) {
        for (size_t i = 0; i < users.size(); i++) {
            if (users[i].getUsername() == username &&
                users[i].getPassword() == password) {

                if (currentUser)
                    delete currentUser;

                if (currentCart)
                    delete currentCart;

                currentUser = new User(users[i]);
                currentCart = new Cart(nextCartID++,
                                       users[i].getUserID());

                cout << "Welcome, "
                     << users[i].getFullName() << "!\n";

                return true;
            }
        }

        cout << "Invalid username or password!\n";
        return false;
    }

    void logout() {
        if (currentUser) {
            delete currentUser;
            currentUser = NULL;

            if (currentCart) {
                delete currentCart;
                currentCart = NULL;
            }

            cout << "Logged out successfully.\n";
        }
    }

    bool isLoggedIn() const {
        return currentUser != NULL;
    }

    bool isAdmin() const {
        return currentUser != NULL &&
               currentUser->getIsAdmin();
    }

    // ---------- PRODUCTS ----------
    void uploadProduct(string name, string description,
                       double price, int stock,
                       string category) {

        if (!isAdmin()) {
            cout << "Only administrators can upload products!\n";
            return;
        }

        Product newProduct(nextProductID++, name,
                           description, price,
                           stock, category);

        products.push_back(newProduct);
        saveProducts();

        cout << "Product uploaded successfully! ID: "
             << newProduct.getProductID() << "\n";
    }

    void displayAllProducts() const {
        if (products.empty()) {
            cout << "No products available.\n";
            return;
        }

        cout << "\n=== DEECRAFTNG PRODUCTS ===\n";

        for (size_t i = 0; i < products.size(); i++)
            products[i].display();
    }

    // ---------- SEARCH ----------
    void searchProductByName(string name) const {
        cout << "\n=== SEARCH RESULTS FOR: "
             << name << " ===\n";

        bool found = false;

        for (size_t i = 0; i < products.size(); i++) {
            if (products[i].getProductName().find(name) != string::npos) {
                products[i].display();
                found = true;
            }
        }

        if (!found)
            cout << "No products found.\n";
    }

    void searchProductByCategory(string category) const {
        cout << "\n=== PRODUCTS IN CATEGORY: "
             << category << " ===\n";

        bool found = false;

        for (size_t i = 0; i < products.size(); i++) {
            if (products[i].getCategory() == category) {
                products[i].display();
                found = true;
            }
        }

        if (!found)
            cout << "No products found in this category.\n";
    }

    Product* getProductByID(int id) {
        for (size_t i = 0; i < products.size(); i++) {
            if (products[i].getProductID() == id)
                return &products[i];
        }

        return NULL;
    }

    // ---------- CART ----------
    void addToCart(int productID, int quantity) {
        if (!isLoggedIn()) {
            cout << "Please login first!\n";
            return;
        }

        if (quantity <= 0) {
            cout << "Quantity must be greater than 0.\n";
            return;
        }

        Product* product = getProductByID(productID);

        if (!product) {
            cout << "Product not found!\n";
            return;
        }

        if (product->getStock() < quantity) {
            cout << "Insufficient stock! Available: "
                 << product->getStock() << "\n";
            return;
        }

        currentCart->addItem(*product, quantity);

        cout << quantity << " x "
             << product->getProductName()
             << " added to cart!\n";
    }

    void removeFromCart(int productID) {
        if (!isLoggedIn()) {
            cout << "Please login first!\n";
            return;
        }

        currentCart->removeItem(productID);
        cout << "Item removed from cart!\n";
    }

    void viewCart() const {
        if (!isLoggedIn()) {
            cout << "Please login first!\n";
            return;
        }

        currentCart->display();
    }

    // ---------- ORDERS ----------
    void placeOrder() {
        if (!isLoggedIn()) {
            cout << "Please login first!\n";
            return;
        }

        if (currentCart->isEmpty()) {
            cout << "Your cart is empty!\n";
            return;
        }

        double totalAmount = currentCart->getTotalPrice();
        vector<CartItem> cartItems = currentCart->getItems();

        for (size_t i = 0; i < cartItems.size(); i++) {
            Product* product =
                getProductByID(
                    cartItems[i].getProduct().getProductID());

            if (product)
                product->reduceStock(cartItems[i].getQuantity());
        }

        Order newOrder(nextOrderID++,
                       currentUser->getUserID(),
                       cartItems,
                       totalAmount);

        orders.push_back(newOrder);

        saveProducts();
        saveOrders();

        cout << "\n=== ORDER PLACED SUCCESSFULLY ===\n";
        newOrder.display();

        currentCart->clear();
    }

    void viewOrderHistory() const {
        if (!isLoggedIn()) {
            cout << "Please login first!\n";
            return;
        }

        cout << "\n=== YOUR ORDER HISTORY ===\n";

        bool found = false;

        for (size_t i = 0; i < orders.size(); i++) {
            if (orders[i].getUserID() ==
                currentUser->getUserID()) {

                orders[i].display();
                found = true;
            }
        }

        if (!found)
            cout << "You have no orders yet.\n";
    }

    // ---------- ADMIN ----------
    void adminPanel() {
        if (!isAdmin()) {
            cout << "Admin access denied!\n";
            return;
        }

        int choice;

        while (true) {
            cout << "\n=== ADMIN PANEL ===\n";
            cout << "1. Upload New Product\n";
            cout << "2. View All Products\n";
            cout << "3. View All Orders\n";
            cout << "4. Exit Admin Panel\n";
            cout << "Choice: ";

            cin >> choice;
            cin.ignore(1000, '\n');

            if (choice == 1) {
                string name, desc, category;
                double price;
                int stock;

                cout << "Product Name: ";
                getline(cin, name);

                cout << "Description: ";
                getline(cin, desc);

                cout << "Price (GHS): ";
                cin >> price;

                cout << "Stock Quantity: ";
                cin >> stock;
                cin.ignore(1000, '\n');

                cout << "Category: ";
                getline(cin, category);

                uploadProduct(name, desc, price,
                              stock, category);

            } else if (choice == 2) {
                displayAllProducts();

            } else if (choice == 3) {
                viewAllOrders();

            } else if (choice == 4) {
                break;

            } else {
                cout << "Invalid choice!\n";
            }
        }
    }

    void viewAllOrders() const {
        cout << "\n=== ALL ORDERS ===\n";

        if (orders.empty()) {
            cout << "No orders yet.\n";
            return;
        }

        for (size_t i = 0; i < orders.size(); i++)
            orders[i].display();
    }

    // ---------- MAIN MENU ----------
    void run() {
        int choice;

        while (true) {
            cout << "\n================================\n";
            cout << "       DEECRAFTNG SYSTEM\n";
            cout << "================================\n";
            cout << "1. Sign Up\n";
            cout << "2. Sign In\n";
            cout << "3. View Products\n";
            cout << "4. Search Product\n";
            cout << "5. Add Product to Cart\n";
            cout << "6. View Cart\n";
            cout << "7. Remove from Cart\n";
            cout << "8. Place Order\n";
            cout << "9. Order History\n";
            cout << "10. Admin Panel\n";
            cout << "11. Logout\n";
            cout << "0. Exit\n";
            cout << "Choice: ";

            cin >> choice;

            if (cin.fail()) {
                cin.clear();
                cin.ignore(1000, '\n');
                cout << "Please enter a number.\n";
                continue;
            }

            cin.ignore(1000, '\n');

            if (choice == 1) {
                string username, password, email, fullName;

                cout << "Username: ";
                getline(cin, username);

                cout << "Password: ";
                getline(cin, password);

                cout << "Email: ";
                getline(cin, email);

                cout << "Full Name: ";
                getline(cin, fullName);

                signup(username, password, email, fullName);

            } else if (choice == 2) {
                string username, password;

                cout << "Username: ";
                getline(cin, username);

                cout << "Password: ";
                getline(cin, password);

                signin(username, password);

            } else if (choice == 3) {
                displayAllProducts();

            } else if (choice == 4) {
                int searchChoice;
                string value;

                cout << "1. Search by Name\n";
                cout << "2. Search by Category\n";
                cout << "Choice: ";
                cin >> searchChoice;
                cin.ignore(1000, '\n');

                cout << "Enter search value: ";
                getline(cin, value);

                if (searchChoice == 1)
                    searchProductByName(value);
                else if (searchChoice == 2)
                    searchProductByCategory(value);
                else
                    cout << "Invalid choice.\n";

            } else if (choice == 5) {
                int id, quantity;

                cout << "Product ID: ";
                cin >> id;

                cout << "Quantity: ";
                cin >> quantity;

                cin.ignore(1000, '\n');

                addToCart(id, quantity);

            } else if (choice == 6) {
                viewCart();

            } else if (choice == 7) {
                int id;

                cout << "Product ID to remove: ";
                cin >> id;
                cin.ignore(1000, '\n');

                removeFromCart(id);

            } else if (choice == 8) {
                placeOrder();

            } else if (choice == 9) {
                viewOrderHistory();

            } else if (choice == 10) {
                adminPanel();

            } else if (choice == 11) {
                logout();

            } else if (choice == 0) {
                cout << "Thank you for using DEECRAFTNG SYSTEM!\n";
                break;

            } else {
                cout << "Invalid choice. Try again.\n";
            }
        }
    }
};

// ================= MAIN =================
int main() {
    DeecraftngSystem system;
    system.run();

    return 0;
}
