import java.io.File;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.IOException;
import java.util.Properties;

//  https://stackoverflow.com/questions/29896927/constants-and-properties-in-java
/**
 * This class serves to translate the data from a configuration file into the initialization code you
 * run to start your program. This design principle reduces the chance of errors from re-running code
 * and also works well with the logger so that when you run something, you can store the parameters
 * you used when you decided to run it as well.
 *
 * @author Jason Yoder
 */

public class PropParser {

    public static void load(String filename) {
        try {
            getInstance().load( new FileReader(new File(filename)));
        } catch (FileNotFoundException e) {
            System.err.println("Filename: "+filename+" not found.");
            e.printStackTrace();
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    private static Properties properties;
    private static Properties getInstance() {
        if (properties == null) {
            properties = new Properties();
        }
        return properties;
    }

    public static String getProperty(String propID) {
        return getInstance().getProperty(propID);
    }


}