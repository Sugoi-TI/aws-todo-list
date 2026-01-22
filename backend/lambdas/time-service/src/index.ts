export const handler = async () => {
    const now = new Date().toISOString();
    console.log("Generating time:", now);

    return {
        time: now,
    };
};
