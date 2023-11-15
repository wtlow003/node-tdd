const request = require("supertest");
const app = require("../src/app");
const User = require("../src/models/user");
const sequelize = require("../src/config/database");

beforeAll(() => {
  return sequelize.sync();
});

beforeEach(() => {
  return User.destroy({ truncate: true });
});

const validUser = {
  username: "test_user",
  email: "testuser@mail.com",
  password: "Password2",
};

const allNullUser = {
  username: null,
  email: null,
  password: null,
};

const postUser = (user = validUser, options = {}) => {
  const agent = request(app).post("/api/1.0/users");
  if (options.language) {
    agent.set("Accept-Language", options.language);
  }
  return agent.send(user);
};

describe("User Registration", () => {
  it("return 201 Created when signup request is valid", async () => {
    const response = await postUser();
    expect(response.status).toBe(201);
  });

  it("return success message when signup request is valid", async () => {
    const response = await postUser();
    expect(response.body.message).toBe("User created!");
  });

  it("save user to the database", async () => {
    await postUser();
    const userList = await User.findAll();
    expect(userList.length).toBe(1);
  });

  it("save the username and email to the database", async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.username).toBe("test_user");
    expect(savedUser.email).toBe("testuser@mail.com");
    expect(userList.length).toBe(1);
  });

  it("hashes the user password", async () => {
    await postUser();
    const userList = await User.findAll();
    const savedUser = userList[0];
    expect(savedUser.password).not.toBe("password");
  });

  it("return validationError field in response body when validation error occurs", async () => {
    const response = await postUser(allNullUser);
    const body = response.body;
    expect(body.validationErrors).not.toBeUndefined();
  });

  it("return errors for username, email, and password when all is null", async () => {
    const response = await postUser(allNullUser);
    const body = response.body;
    // if using number as key e.g., "1", "2",
    // the sequence may different from the actual expected test output
    expect(Object.keys(body.validationErrors)).toEqual([
      "username",
      "email",
      "password",
    ]);
  });

  // dynamic tests table style
  it.each`
    field         | expectedStatusCode
    ${"username"} | ${400}
    ${"email"}    | ${400}
    ${"password"} | ${400}
  `(
    "when $field is null return $expectedCode bad request",
    // getting values by object destructuring
    async ({ field, expectedStatusCode }) => {
      const user = {
        username: "test-user",
        email: "testuser@mail.com",
        password: "password",
      };
      user[field] = null;
      const response = await postUser(user);
      expect(response.status).toBe(expectedStatusCode);
    },
  );

  const username_null = "Username cannot be null";
  const email_null = "Email cannot be null";
  const password_null = "Password cannot be null";
  const username_length =
    "Username should have minimum of 4 and maximum of 32 characters";
  const password_length = "Password must be at least 6 characters";
  const email_format = "Email is not in valid format";
  const password_pattern =
    "Password should have at least 1 uppercase and lowercase character, and 1 number";
  const email_inuse = "Email is already in use";

  // dynamic test alternatively
  it.each([
    ["username", username_null],
    ["email", email_null],
    ["password", password_null],
  ])("when %s is null %s is received", async (field, expectedMessage) => {
    const user = {
      username: "test_user",
      email: "testuser@mail.com",
      password: "password",
    };
    user[field] = null;
    const response = await postUser(user);
    const body = response.body;
    expect(body.validationErrors[field]).toBe(expectedMessage);
  });

  it.each([
    ["short", username_length],
    ["long", username_length],
  ])(
    "when username is too %s %s is received",
    async (lengthIssue, expectedMessage) => {
      const user = {
        username: "usr",
        email: "testuser@mail.com",
        password: "password",
      };
      if (lengthIssue === "long") {
        user.username = "u".repeat(33);
      }
      const response = await postUser(user);
      const body = response.body;
      expect(body.validationErrors.username).toBe(expectedMessage);
    },
  );

  it.each([
    ["user.mail", email_format],
    ["user@mail", email_format],
  ])("when email is %s %s is received", async (field, expectedMessage) => {
    const user = {
      username: "user",
      email: field,
      password: "password",
    };
    const response = await postUser(user);
    const body = response.body;
    expect(body.validationErrors.email).toBe(expectedMessage);
  });

  it("return password must be at least 6 characters when password is too short", async () => {
    const user = {
      username: "user",
      email: "testuser@mail.com",
      password: "123",
    };
    const response = await postUser(user);
    const body = response.body;
    expect(body.validationErrors.password).toBe(password_length);
  });

  it.each([
    ["123", "Password must be at least 6 characters"],
    ["password", password_pattern],
    ["password1", password_pattern],
    ["Password", password_pattern],
  ])(
    "when password is %s %s is recevied",
    async (password, expectedMessage) => {
      const user = {
        user: "user",
        email: "testuser@mail.com",
        password: password,
      };
      const response = await postUser(user);
      const body = response.body;
      expect(body.validationErrors.password).toBe(expectedMessage);
    },
  );

  it("returns 400 bad request when email is already in use", async () => {
    await User.create({ ...validUser });
    const response = await postUser(validUser);
    expect(response.status).toBe(400);
  });

  it("returns email in use when email is already in use", async () => {
    await User.create({ ...validUser });
    const response = await postUser(validUser);
    const body = response.body;
    expect(body.validationErrors.email).toBe(email_inuse);
  });

  it("return both errors for username is null and email is in use", async () => {
    await User.create({ ...validUser });
    const user = {
      username: "usr",
      email: "testuser@mail.com",
      password: "Password123",
    };
    const response = await postUser(user);
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(["username", "email"]);
  });
});

describe("Internationalisation", () => {
  const username_null = "Kullanıcı adı null olamaz";
  const email_null = "E-posta null olamaz";
  const password_null = "Parola null olamaz";
  const username_length =
    "Kullanıcı adı en az 4, en fazla 32 karakterden oluşmalıdır";
  const password_length = "Şifre en az 6 karakterden oluşmalıdır";
  const email_format = "E-posta geçerli biçimde değil";
  const password_pattern =
    "Parola en az 1 büyük ve küçük harf karakterinden ve 1 rakamdan oluşmalıdır";
  const email_inuse = "E-posta zaten kullanılıyor";

  // dynamic test alternatively
  it.each([
    ["username", username_null],
    ["email", email_null],
    ["password", password_null],
  ])(
    "when %s is null %s is received when language is set to turkish",
    async (field, expectedMessage) => {
      const user = {
        username: "test_user",
        email: "testuser@mail.com",
        password: "password",
      };
      user[field] = null;
      const response = await postUser(user, { language: "tr" });
      const body = response.body;
      expect(body.validationErrors[field]).toBe(expectedMessage);
    },
  );

  it.each([
    ["short", username_length],
    ["long", username_length],
  ])(
    "when username is too %s %s is received when language is set to turkish",
    async (lengthIssue, expectedMessage) => {
      const user = {
        username: "usr",
        email: "testuser@mail.com",
        password: "password",
      };
      if (lengthIssue === "long") {
        user.username = "u".repeat(33);
      }
      const response = await postUser(user, { language: "tr" });
      const body = response.body;
      expect(body.validationErrors.username).toBe(expectedMessage);
    },
  );

  it.each([
    ["user.mail", email_format],
    ["user@mail", email_format],
  ])(
    "when email is %s %s is received when language is set to turkish",
    async (field, expectedMessage) => {
      const user = {
        username: "user",
        email: field,
        password: "password",
      };
      const response = await postUser(user, { language: "tr" });
      const body = response.body;
      expect(body.validationErrors.email).toBe(expectedMessage);
    },
  );

  it("return password must be at least 6 characters when password is too short when language is set to turkish", async () => {
    const user = {
      username: "user",
      email: "testuser@mail.com",
      password: "123",
    };
    const response = await postUser(user, { language: "tr" });
    const body = response.body;
    expect(body.validationErrors.password).toBe(password_length);
  });

  it.each([
    ["123", password_length],
    ["password", password_pattern],
    ["password1", password_pattern],
    ["Password", password_pattern],
  ])(
    "when password is %s %s is recevied when language is set to turkish",
    async (password, expectedMessage) => {
      const user = {
        user: "user",
        email: "testuser@mail.com",
        password: password,
      };
      const response = await postUser(user, { language: "tr" });
      const body = response.body;
      expect(body.validationErrors.password).toBe(expectedMessage);
    },
  );

  it("returns email in use when email is already in use when language is set to turkish", async () => {
    await User.create({ ...validUser });
    const response = await postUser(validUser, { language: "tr" });
    const body = response.body;
    expect(body.validationErrors.email).toBe(email_inuse);
  });

  it("return both errors for username is null and email is in use when language is set to turkish", async () => {
    await User.create({ ...validUser });
    const user = {
      username: "usr",
      email: "testuser@mail.com",
      password: "Password123",
    };
    const response = await postUser(user, { language: "tr" });
    const body = response.body;
    expect(Object.keys(body.validationErrors)).toEqual(["username", "email"]);
  });
});
