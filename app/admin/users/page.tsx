import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";


export default async function AdminUsersPage() {

  const users = await prisma.user.findMany({

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      plan: true,
    },

  });



  return (

    <main>

      <h1>
        مدیریت کاربران
      </h1>


      <section>

        {
          users.length === 0 ? (

            <p>
              هنوز کاربری ثبت نشده است.
            </p>

          ) : (

            users.map((user) => (

              <div key={user.id}>

                <p>
                  نام: {user.name}
                </p>

                <p>
                  ایمیل: {user.email}
                </p>

                <p>
                  نقش: {user.role}
                </p>

                <p>
                  پلن: {user.plan}
                </p>

                <hr />

              </div>

            ))

          )
        }

      </section>


    </main>

  );

}
