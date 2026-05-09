import JWT from "jsonwebtoken";

export const createToken = async (
  role: string,
  id: string,
  ex: number,
): Promise<string | number> => {
  try {
    console.log("CHEGOU NO createtoken");
    const secret: string = String(process.env.JWT_SECRET);
    const token: string = JWT.sign({ idUSer: id, roleUser: role }, secret, {
      expiresIn: ex,
    });
    return token;
  } catch (error) {
    return 500;
  }finally{

    console.log("SAIU NO createtoken");
  }
};
