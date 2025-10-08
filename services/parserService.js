const parserService = {
    validateAndParse: (response) => {
        let parsedContent;
        try {
            parsedContent = JSON.parse(response);
        } catch (parseError) {
            console.error("Error parsing JSON response:", parseError);
            console.log("Received content:", response);
            return null;
        }

        // The response might have the questions in parsedContent.questions or directly in parsedContent
        let questions = [];

        if (parsedContent && Array.isArray(parsedContent.questions)) {
            questions = parsedContent.questions;
        } else if (parsedContent && Array.isArray(parsedContent)) {
            questions = parsedContent;
        }

        //Ensure we have at least one question
        if (questions.length === 0) {
            console.error("No questions were found in the response:", parsedContent);
            return null;
        } 

        return questions;
    }


}

module.exports = { parserService };