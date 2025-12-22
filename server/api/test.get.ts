import { faker } from "@faker-js/faker";
export default defineEventHandler(async () => {
  const url =
    "https://logwatch.fairdataihub.org/api/log/cmjgno6kb00067h01ukl411ya";

  const data = {
    level: "info",
    message: JSON.stringify(
      Array.from({ length: 5 }, () => ({
        id: faker.string.uuid(),
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state(),
      })),
    ),
    type: "json",
  };

  console.log(data);

  await fetch(url, {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json",
    },
  })
    .then((response) => response.json())
    .then((data) => {
      console.log(data);
    })
    .catch((error) => {
      console.error(error);
    });

  return { message: "Test message sent" };
});
