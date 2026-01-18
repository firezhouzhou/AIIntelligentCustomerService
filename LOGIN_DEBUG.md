# 登录问题调试指南

## 🔍 问题分析

登录成功后没有跳转到目标页面，可能的原因：

1. **后端 API 返回格式不正确**
2. **Token 没有正确保存**
3. **路由跳转失败**
4. **CORS 跨域问题**

---

## 📋 调试步骤

### 1. 打开浏览器开发者工具

按 `F12` 或右键点击"检查"打开开发者工具

### 2. 查看 Console 日志

在登录页面尝试登录，观察控制台输出：

**期望看到的日志：**
```
开始登录请求: { username: "xxx", apiUrl: "http://localhost:8014/api/auth/login" }
登录响应状态: 200 OK
登录结果处理: { success: true, data: { token: "...", username: "...", email: "..." } }
登录成功，保存 Token: eyJhbGciOiJIUzI1NiIs...
Token 已保存到 localStorage
登录结果: { success: true, data: { ... } }
登录成功，准备跳转到: /chapter_14
```

### 3. 检查 Network 请求

切换到 **Network** 标签：

#### 3.1 找到登录请求
- 名称: `login`
- 方法: `POST`
- URL: `http://localhost:8014/api/auth/login`
- 状态: 应该是 `200 OK`

#### 3.2 查看请求详情

**Request Payload (请求体):**
```json
{
  "username": "testuser",
  "password": "123456"
}
```

**Response (响应):**
```json
{
  "success": true,
  "message": null,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

### 4. 检查 LocalStorage

在 Console 中运行：
```javascript
// 检查 Token 是否保存
localStorage.getItem('chapter14_token')

// 检查用户信息是否保存
localStorage.getItem('chapter14_user')

// 检查登录状态
!!localStorage.getItem('chapter14_token')
```

### 5. 手动测试跳转

如果 Token 已保存，在 Console 中手动测试跳转：
```javascript
// 测试跳转
window.location.href = '/chapter_14'
```

---

## 🐛 常见问题及解决方案

### 问题 1: 后端未启动或端口错误

**症状：**
```
登录响应状态: 0 undefined
或
Failed to fetch
```

**解决方案：**
```bash
# 1. 检查后端是否启动
curl http://localhost:8014/api/health

# 2. 如果未启动，启动后端
cd /Users/zhangsan/githubproject/SpringBootAIProject/chapter_14
mvn spring-boot:run
```

---

### 问题 2: CORS 跨域问题

**症状：**
```
Access to fetch at 'http://localhost:8014/api/auth/login' from origin 'http://localhost:5173' has been blocked by CORS policy
```

**解决方案：**

检查后端 CORS 配置 (`chapter_14/src/main/java/com/example/chapter14/config/CorsConfig.java`)：

```java
@Configuration
public class CorsConfig {
    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        config.setAllowCredentials(true);
        config.addAllowedOriginPattern("*");
        config.addAllowedHeader("*");
        config.addAllowedMethod("*");
        
        source.registerCorsConfiguration("/**", config);
        return new CorsFilter(source);
    }
}
```

---

### 问题 3: 后端返回格式不正确

**症状：**
```
登录结果: { success: false, message: "..." }
```

**检查后端返回：**

在 Postman 或 curl 中测试：
```bash
curl -X POST http://localhost:8014/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"123456"}'
```

**期望返回：**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "username": "testuser",
    "email": "test@example.com"
  }
}
```

---

### 问题 4: Token 保存失败

**症状：**
```
Token 已保存到 localStorage
但 localStorage.getItem('chapter14_token') 返回 null
```

**解决方案：**

检查浏览器隐私设置是否阻止了 localStorage：
- Chrome: 设置 → 隐私和安全 → 网站设置 → Cookie → 允许所有 Cookie
- Firefox: 设置 → 隐私与安全 → Cookie → 接受来自网站的 Cookie

---

### 问题 5: 路由跳转失败

**症状：**
```
登录成功，准备跳转到: /chapter_14
但页面没有跳转
```

**调试代码：**

在 `AuthPage.tsx` 中添加更多日志：
```typescript
if (result.success) {
  console.log('登录成功，准备跳转到:', from);
  console.log('当前路径:', window.location.pathname);
  
  // 手动跳转测试
  window.location.href = from;
}
```

---

## 🔧 快速修复脚本

在浏览器 Console 中运行以下脚本，强制跳转并验证登录状态：

```javascript
// 1. 检查 Token
const token = localStorage.getItem('chapter14_token');
console.log('Token:', token ? '已存在' : '不存在');

// 2. 如果有 Token，直接跳转
if (token) {
  console.log('强制跳转到 /chapter_14');
  window.location.href = '/chapter_14';
} else {
  console.log('没有 Token，请先登录');
}
```

---

## 📞 获取帮助

如果以上方法都无法解决问题，请提供以下信息：

1. **Console 日志截图**（包含所有红色错误）
2. **Network 标签中 login 请求的完整信息**
   - Request Headers
   - Request Payload
   - Response Headers
   - Response Body
3. **LocalStorage 内容**
   ```javascript
   console.log('LocalStorage:', {
     token: localStorage.getItem('chapter14_token'),
     user: localStorage.getItem('chapter14_user')
   });
   ```
4. **后端日志**（从后端终端复制最近的日志）

---

## ✅ 验证修复

登录成功后应该看到：

1. ✅ Console 显示 "登录成功，准备跳转到: /chapter_14"
2. ✅ URL 自动变为 `http://localhost:5173/chapter_14`
3. ✅ 页面显示知识库问答界面
4. ✅ 顶部导航栏显示用户名和"退出"按钮
5. ✅ 刷新页面仍然保持登录状态

如果以上都正常，说明问题已解决！🎉
